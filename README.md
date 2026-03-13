# @gethook/node

Node.js / TypeScript SDK for the [GetHook](https://gethook.io) Webhook Reliability Gateway API.

## Install

```bash
npm install @gethook/node
```

## Usage

```typescript
import { GethookClient } from "@gethook/node";

const client = new GethookClient({
  baseUrl: "https://your-gethook-instance.com",
  getToken: () => process.env.GETHOOK_API_KEY,
});

// List sources
const sources = await client.listSources();

// Create a destination
const destination = await client.createDestination({
  name: "My Webhook Endpoint",
  url: "https://example.com/webhook",
});

// List recent events
const { events, total } = await client.listEvents({ limit: 20 });
```

## Error handling

```typescript
import { GethookClient, GethookApiError } from "@gethook/node";

try {
  await client.getSource("nonexistent-id");
} catch (err) {
  if (err instanceof GethookApiError) {
    console.error(`API error ${err.status}: ${err.body}`);
  }
}
```

## Development

This SDK is auto-managed by `make sync` in the [gethook](https://github.com/gethook/gethook) repo.

```bash
# Regenerate types from the OpenAPI spec (run from gethook/ root)
make sync

# Build the SDK locally
npm run build

# Type-check without emitting
npm run typecheck
```

## License

MIT
