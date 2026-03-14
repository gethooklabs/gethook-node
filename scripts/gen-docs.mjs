#!/usr/bin/env node
/**
 * gen-docs.mjs
 * Generates SDK method reference docs from openapi.yaml.
 *
 * Usage (from gethook-node/, after make sync copies openapi.yaml):
 *   node scripts/gen-docs.mjs
 *
 * Output goes to stdout — piped to docs/api/sdk-node.md by make sync.
 */

import { readFileSync } from "fs";
import { parse } from "yaml";

const spec = parse(readFileSync("openapi.yaml", "utf8"));

// ── Helpers ───────────────────────────────────────────────────────────────────

// Resolve a $ref to the actual schema object in the spec
function resolveRef(schema) {
  if (!schema?.$ref) return schema;
  const parts = schema.$ref.replace(/^#\//, "").split("/");
  return parts.reduce((obj, key) => obj?.[key], spec);
}

function refName(schema) {
  if (!schema) return null;
  if (schema.$ref) return schema.$ref.split("/").pop();
  if (schema.type === "array" && schema.items) return refName(schema.items) + "[]";
  if (schema.type) return schema.type;
  return null;
}

function unwrapDataEnvelope(schema) {
  // Responses are { data: T } — unwrap to get the actual type
  if (schema?.properties?.data) return refName(schema.properties.data);
  return refName(schema);
}

function pathParams(path) {
  return (path.match(/\{(\w+)\}/g) ?? []).map((p) => p.slice(1, -1));
}

function bodySchema(op) {
  return op.requestBody?.content?.["application/json"]?.schema ?? null;
}

function queryParams(op) {
  return (op.parameters ?? []).filter((p) => p.in === "query");
}

function returnType(op, httpMethod) {
  if (httpMethod === "delete") return "void";
  const success = op.responses?.["200"] ?? op.responses?.["201"];
  if (!success) return "void";
  const schema = success.content?.["application/json"]?.schema;
  return unwrapDataEnvelope(schema) ?? "void";
}

// Build TypeScript signature matching the hand-authored client.ts
function signature(path, httpMethod, op) {
  const pp = pathParams(path).filter((p) => p !== "token");
  const bs = bodySchema(op);
  const bodyType = bs ? refName(bs) : null;
  const qp = queryParams(op);
  const rt = returnType(op, httpMethod);

  const params = [
    ...pp.map((p) => `${p}: string`),
    ...(bodyType ? [`body: ${bodyType}`] : []),
    ...(qp.length
      ? [
          `params?: { ${qp
            .map((q) => `${q.name}?: ${q.schema?.type ?? "string"}`)
            .join("; ")} }`,
        ]
      : []),
  ];

  return { sig: `${op.operationId}(${params.join(", ")})`, rt, pp, bodyType, qp };
}

// Build a realistic TypeScript usage example
function example(path, httpMethod, op, info) {
  const { rt, pp, bodyType, qp } = info;
  const lines = [];

  if (bodyType) {
    // Show a skeleton body using required fields from the spec
    const bs = resolveRef(bodySchema(op));
    const required = bs?.required ?? [];
    const props = bs?.properties ?? {};
    const fields = required.length ? required : Object.keys(props).slice(0, 3);
    const fieldLines = fields.map((f) => {
      const prop = props[f];
      if (!prop) return `  ${f}: "...",`;
      if (prop.example !== undefined) {
        const v = typeof prop.example === "string" ? `"${prop.example}"` : prop.example;
        return `  ${f}: ${v},`;
      }
      if (prop.type === "string") return `  ${f}: "...",`;
      if (prop.type === "integer" || prop.type === "number") return `  ${f}: 0,`;
      if (prop.type === "boolean") return `  ${f}: true,`;
      if (prop.type === "object") return `  ${f}: {},`;
      return `  ${f}: "...",`;
    });
    lines.push(`const body: ${bodyType} = {`);
    for (const fl of fieldLines) lines.push(fl);
    lines.push("};");
  }

  const args = [
    ...pp.map((p) => `"<${p}>"`),
    ...(bodyType ? ["body"] : []),
    ...(qp.length ? [`{ ${qp.map((q) => `${q.name}: ...`).join(", ")} }`] : []),
  ];

  const call = `await client.${op.operationId}(${args.join(", ")})`;
  lines.push(rt !== "void" ? `const result = ${call};` : `${call};`);

  return lines.join("\n");
}

// ── Tag display names ─────────────────────────────────────────────────────────

const TAG_LABELS = {
  health: "Health",
  accounts: "Accounts",
  auth: "Auth",
  "api-keys": "API Keys",
  sources: "Sources",
  destinations: "Destinations",
  routes: "Routes",
  stats: "Stats",
  ingest: "Ingest",
  events: "Events (Inbound)",
  "outbound-events": "Events (Outbound)",
  brand: "Brand & White-Labeling",
  "custom-domains": "Custom Domains",
};

// ── Collect operations by tag ─────────────────────────────────────────────────

const byTag = {};
for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
  for (const [httpMethod, op] of Object.entries(pathItem)) {
    if (typeof op !== "object" || !op?.operationId) continue;
    const tag = op.tags?.[0] ?? "other";
    (byTag[tag] ??= []).push({ path, httpMethod, op });
  }
}

// ── Render ────────────────────────────────────────────────────────────────────

const out = [];
const ln = (s = "") => out.push(s);

ln("# @gethook/node — SDK Reference");
ln();
ln("## Installation");
ln();
ln("```bash");
ln("npm install @gethook/node");
ln("```");
ln();
ln("## Setup");
ln();
ln("```typescript");
ln('import { GethookClient } from "@gethook/node";');
ln();
ln("const client = new GethookClient({");
ln("  baseUrl: process.env.GETHOOK_API_URL!,");
ln("  // Return the stored API key on every request");
ln('  getToken: () => localStorage.getItem("gethook_api_key"),');
ln("  // Redirect to login on 401");
ln('  onUnauthorized: () => { window.location.href = "/login"; },');
ln("});");
ln("```");
ln();
ln("## Error handling");
ln();
ln("All methods throw `GethookApiError` on non-2xx responses.");
ln();
ln("```typescript");
ln('import { GethookClient, GethookApiError } from "@gethook/node";');
ln();
ln("try {");
ln('  await client.deleteSource("<id>");');
ln("} catch (err) {");
ln("  if (err instanceof GethookApiError) {");
ln("    console.error(`HTTP ${err.status}:`, err.body);");
ln("  }");
ln("}");
ln("```");
ln();
ln("---");
ln();

const tagOrder = Object.keys(TAG_LABELS);
const allTags = [...new Set([...tagOrder, ...Object.keys(byTag)])];

for (const tag of allTags) {
  const ops = byTag[tag];
  if (!ops?.length) continue;

  const label = TAG_LABELS[tag] ?? tag;
  ln(`## ${label}`);
  ln();

  for (const { path, httpMethod, op } of ops) {
    const info = signature(path, httpMethod, op);

    ln(`### \`${info.sig}\``);
    ln();

    if (op.summary) ln(op.summary + ".");
    if (op.description && op.description !== op.summary) {
      ln();
      ln(op.description.trim());
    }
    ln();

    // Auth note
    const secured = op.security !== undefined ? op.security.length > 0 : true;
    const isOpen = op.security !== undefined && op.security.length === 0;
    if (isOpen) {
      ln("> No API key required.");
      ln();
    }

    // Parameters
    const allParams = [
      ...info.pp.map((p) => {
        const paramSpec = (op.parameters ?? []).find((x) => x.name === p);
        return `- \`${p}\` \`string\` — ${paramSpec?.description ?? "Resource ID"}`;
      }),
      ...(info.bodyType ? [`- \`body\` \`${info.bodyType}\` — Request body (see type)`] : []),
      ...queryParams(op).map(
        (q) =>
          `- \`params.${q.name}\` \`${q.schema?.type ?? "string"}\`${q.description ? ` — ${q.description}` : ""} _(optional)_`
      ),
    ];

    if (allParams.length) {
      ln("**Parameters:**");
      ln();
      for (const p of allParams) ln(p);
      ln();
    }

    ln(`**Returns:** \`Promise<${info.rt}>\``);
    ln();
    ln("```typescript");
    ln(example(path, httpMethod, op, info));
    ln("```");
    ln();
    ln("---");
    ln();
  }
}

process.stdout.write(out.join("\n") + "\n");
