/**
 * GetHook TypeScript SDK
 * Generated from docs/openapi.yaml — do not edit by hand.
 * Hand-authored fetch wrapper over auto-generated types in schema.gen.ts.
 */

import type { components } from "./schema.gen";

// ── Re-exported entity types ─────────────────────────────────────────────────

export type Account = components["schemas"]["Account"];
export type APIKey = components["schemas"]["APIKey"];
export type APIKeyWithSecret = components["schemas"]["APIKeyWithSecret"];
export type Source = components["schemas"]["Source"];
export type Destination = components["schemas"]["Destination"];
export type RetryPolicy = components["schemas"]["RetryPolicy"];
export type Route = components["schemas"]["Route"];
export type Event = components["schemas"]["Event"];
export type DeliveryAttempt = components["schemas"]["DeliveryAttempt"];
export type BrandSettings = components["schemas"]["BrandSettings"];
export type CustomDomain = components["schemas"]["CustomDomain"];
export type StatsData = components["schemas"]["StatsData"];
export type StatsDailyItem = components["schemas"]["StatsDailyItem"];
export type StatsStatusItem = components["schemas"]["StatsStatusItem"];
export type EventListData = components["schemas"]["EventListData"];
export type EventDetailData = components["schemas"]["EventDetailData"];
export type ReplayEventData = components["schemas"]["ReplayEventData"];
export type AccountBootstrapData = components["schemas"]["AccountBootstrapData"];
export type IngestAcceptedData = components["schemas"]["IngestAcceptedData"];
export type PublishOutboundData = components["schemas"]["PublishOutboundData"];
export type ErrorResponse = components["schemas"]["ErrorResponse"];

// ── Request types ────────────────────────────────────────────────────────────

export type CreateAccountRequest = components["schemas"]["CreateAccountRequest"];
export type RegisterRequest = components["schemas"]["RegisterRequest"];
export type LoginRequest = components["schemas"]["LoginRequest"];
export type CreateAPIKeyRequest = components["schemas"]["CreateAPIKeyRequest"];
export type CreateSourceRequest = components["schemas"]["CreateSourceRequest"];
export type CreateDestinationRequest = components["schemas"]["CreateDestinationRequest"];
export type UpdateDestinationRequest = components["schemas"]["UpdateDestinationRequest"];
export type CreateRouteRequest = components["schemas"]["CreateRouteRequest"];
export type PublishOutboundEventRequest = components["schemas"]["PublishOutboundEventRequest"];
export type UpsertBrandSettingsRequest = components["schemas"]["UpsertBrandSettingsRequest"];
export type CreateCustomDomainRequest = components["schemas"]["CreateCustomDomainRequest"];

// ── Client ───────────────────────────────────────────────────────────────────

export interface GethookClientOptions {
  baseUrl: string;
  /**
   * Return the Bearer token to use for authenticated requests.
   * Return null/undefined to make the request without auth.
   */
  getToken?: () => string | null | undefined;
  /**
   * Called when the server returns 401. Use this to redirect to login,
   * clear stored credentials, etc.
   */
  onUnauthorized?: () => void;
}

export class GethookApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`API error ${status}: ${body}`);
    this.name = "GethookApiError";
  }
}

export class GethookClient {
  private readonly baseUrl: string;
  private readonly getToken: () => string | null | undefined;
  private readonly onUnauthorized: () => void;

  constructor(options: GethookClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.getToken = options.getToken ?? (() => null);
    this.onUnauthorized = options.onUnauthorized ?? (() => {});
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    skipAuth = false,
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string>),
    };
    if (!skipAuth) {
      const token = this.getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers });

    if (res.status === 401) {
      this.onUnauthorized();
      throw new GethookApiError(401, "unauthorized");
    }

    if (!res.ok) {
      const body = await res.text();
      throw new GethookApiError(res.status, body);
    }

    if (res.status === 204) return undefined as T;

    const json = await res.json() as { data?: T };
    // Unwrap the { data: ... } envelope
    return (json.data !== undefined ? json.data : json) as T;
  }

  // ── Health ──────────────────────────────────────────────────────────────────

  healthz(): Promise<{ status: string }> {
    return this.request("/healthz", {}, true);
  }

  readyz(): Promise<{ status: string }> {
    return this.request("/readyz", {}, true);
  }

  // ── Accounts ────────────────────────────────────────────────────────────────

  createAccount(body: CreateAccountRequest): Promise<AccountBootstrapData> {
    return this.request("/v1/accounts", {
      method: "POST",
      body: JSON.stringify(body),
    }, true);
  }

  // ── Auth ────────────────────────────────────────────────────────────────────

  register(body: RegisterRequest): Promise<AccountBootstrapData> {
    return this.request("/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }, true);
  }

  login(body: LoginRequest): Promise<AccountBootstrapData> {
    return this.request("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }, true);
  }

  // ── API Keys ────────────────────────────────────────────────────────────────

  createApiKey(body: CreateAPIKeyRequest): Promise<APIKeyWithSecret> {
    return this.request("/v1/api-keys", { method: "POST", body: JSON.stringify(body) });
  }

  listApiKeys(): Promise<APIKey[]> {
    return this.request("/v1/api-keys");
  }

  deleteApiKey(id: string): Promise<void> {
    return this.request(`/v1/api-keys/${id}`, { method: "DELETE" });
  }

  // ── Sources ─────────────────────────────────────────────────────────────────

  createSource(body: CreateSourceRequest): Promise<Source> {
    return this.request("/v1/sources", { method: "POST", body: JSON.stringify(body) });
  }

  listSources(): Promise<Source[]> {
    return this.request("/v1/sources");
  }

  getSource(id: string): Promise<Source> {
    return this.request(`/v1/sources/${id}`);
  }

  deleteSource(id: string): Promise<void> {
    return this.request(`/v1/sources/${id}`, { method: "DELETE" });
  }

  // ── Destinations ────────────────────────────────────────────────────────────

  createDestination(body: CreateDestinationRequest): Promise<Destination> {
    return this.request("/v1/destinations", { method: "POST", body: JSON.stringify(body) });
  }

  listDestinations(): Promise<Destination[]> {
    return this.request("/v1/destinations");
  }

  getDestination(id: string): Promise<Destination> {
    return this.request(`/v1/destinations/${id}`);
  }

  updateDestination(id: string, body: UpdateDestinationRequest): Promise<Destination> {
    return this.request(`/v1/destinations/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  }

  deleteDestination(id: string): Promise<void> {
    return this.request(`/v1/destinations/${id}`, { method: "DELETE" });
  }

  // ── Routes ──────────────────────────────────────────────────────────────────

  createRoute(body: CreateRouteRequest): Promise<Route> {
    return this.request("/v1/routes", { method: "POST", body: JSON.stringify(body) });
  }

  listRoutes(): Promise<Route[]> {
    return this.request("/v1/routes");
  }

  deleteRoute(id: string): Promise<void> {
    return this.request(`/v1/routes/${id}`, { method: "DELETE" });
  }

  // ── Stats ───────────────────────────────────────────────────────────────────

  getStats(): Promise<StatsData> {
    return this.request("/v1/stats");
  }

  // ── Inbound Events ──────────────────────────────────────────────────────────

  listEvents(params?: { limit?: number; offset?: number }): Promise<EventListData> {
    const qs = buildQS(params);
    return this.request(`/v1/events${qs}`);
  }

  getEvent(id: string): Promise<EventDetailData> {
    return this.request(`/v1/events/${id}`);
  }

  replayEvent(id: string): Promise<ReplayEventData> {
    return this.request(`/v1/events/${id}/replay`, { method: "POST" });
  }

  // ── Outbound Events ─────────────────────────────────────────────────────────

  publishOutboundEvent(body: PublishOutboundEventRequest): Promise<PublishOutboundData> {
    return this.request("/v1/outbound-events", { method: "POST", body: JSON.stringify(body) });
  }

  listOutboundEvents(params?: { limit?: number; offset?: number }): Promise<EventListData> {
    const qs = buildQS(params);
    return this.request(`/v1/outbound-events${qs}`);
  }

  getOutboundEvent(id: string): Promise<EventDetailData> {
    return this.request(`/v1/outbound-events/${id}`);
  }

  replayOutboundEvent(id: string): Promise<ReplayEventData> {
    return this.request(`/v1/outbound-events/${id}/replay`, { method: "POST" });
  }

  // ── Brand Settings ──────────────────────────────────────────────────────────

  upsertBrandSettings(body: UpsertBrandSettingsRequest): Promise<BrandSettings> {
    return this.request("/v1/brand-settings", { method: "POST", body: JSON.stringify(body) });
  }

  getBrandSettings(): Promise<BrandSettings | Record<string, never>> {
    return this.request("/v1/brand-settings");
  }

  // ── Custom Domains ──────────────────────────────────────────────────────────

  createCustomDomain(body: CreateCustomDomainRequest): Promise<CustomDomain> {
    return this.request("/v1/custom-domains", { method: "POST", body: JSON.stringify(body) });
  }

  listCustomDomains(): Promise<CustomDomain[]> {
    return this.request("/v1/custom-domains");
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildQS(params?: Record<string, string | number | undefined>): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string | number][];
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}
