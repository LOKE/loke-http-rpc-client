# Migration Guide

This guide helps you migrate between major versions of `@loke/http-rpc-client`.

## Table of Contents

- [v4 to v5](#migrating-from-v4-to-v5)
- [v3 to v4](#migrating-from-v3-to-v4)
- [v2 to v3](#migrating-from-v2-to-v3)
- [v1 to v2](#migrating-from-v1-to-v2)

---

## Migrating from v4 to v5

### Breaking Changes

#### 1. Node.js Version Requirement

**v4:** Node.js >= 8
**v5:** Node.js >= 20

**Action Required:** Upgrade to Node.js 20 or later.

```bash
# Check your Node.js version
node --version
```

#### 2. Removed Legacy `load()` Function

The legacy `load()` function and IPC manifest support have been completely removed.

**v4:**

```typescript
import { load } from "@loke/http-rpc-client";

const client = load("http://example.com", "my-service", {
  /* options */
});
```

**v5:**

```typescript
import { RPCClient } from "@loke/http-rpc-client";

const client = new RPCClient("http://example.com/", "my-service");
```

**Migration Steps:**

1. Remove all `ipc_manifests/*.json` files (no longer used)
2. Replace `load()` calls with direct instantiation of `RPCClient` or `RPCContextClient`
3. Update method calls to use the new client API

#### 3. `@loke/context` is now a Peer Dependency

**v4:** `@loke/context` was a regular dependency
**v5:** `@loke/context` is a peer dependency

**Action Required:** Add `@loke/context` to your `package.json`:

```bash
npm install @loke/context
```

```json
{
  "dependencies": {
    "@loke/context": ">=0.0.1 <1"
  }
}
```

#### 4. Network Errors Now Use `RpcHTTPError`

Network-level errors (connection failures, DNS errors, etc.) are now wrapped in `RpcHTTPError` for better error handling.

**v5:**

```typescript
import {
  RPCClient,
  RpcHTTPError,
  RpcResponseError,
} from "@loke/http-rpc-client";

try {
  const result = await client.request("myMethod", params);
} catch (err) {
  if (err instanceof RpcHTTPError) {
    // Network-level error (connection failed, DNS error, etc.)
    console.error("Network error:", err.message);
    console.error("Cause:", err.cause);
  } else if (err instanceof RpcResponseError) {
    // Application-level error from the remote service
    console.error("RPC error:", err.message);
  }
}
```

#### 5. Native Fetch Instead of node-fetch

The package now uses Node.js native `fetch` API instead of `node-fetch`.

**Action Required:** None if using Node.js 20+. The native fetch is available globally.

#### 6. Module System Changes

The package now provides both ESM and CommonJS builds with proper exports.

**ESM:**

```typescript
import { RPCClient, RPCContextClient } from "@loke/http-rpc-client";
```

**CommonJS:**

```javascript
const { RPCClient, RPCContextClient } = require("@loke/http-rpc-client");
```

#### 7. prom-client Peer Dependency Updated

**v4:** `prom-client: ">=12 <=14"`
**v5:** `prom-client: ">=12 <=15"`

**Action Required:** Update prom-client if using v15:

```bash
npm install prom-client@^15
```

---

## Migrating from v3 to v4

### Breaking Changes

#### 1. Context Support Required

v4 introduced `@loke/context` for request context management.

**New Classes:**

- `RPCContextClient` - Uses `@loke/context` for request lifecycle management
- `RPCClient` - Maintains backward compatibility with timeout options

**v3:**

```javascript
const client = new RPCClient(baseURL, serviceName);
await client.request("method", params);
```

**v4 (Recommended):**

```typescript
import * as context from "@loke/context";
import { RPCContextClient } from "@loke/http-rpc-client";

const client = new RPCContextClient(baseURL, serviceName);
const ctx = context.background;
await client.request(ctx, "method", params);
```

**v4 (Legacy compatibility):**

```typescript
import { RPCClient } from "@loke/http-rpc-client";

const client = new RPCClient(baseURL, serviceName);
await client.request("method", params, { timeout: 5000 });
```

#### 2. Request Timeout Handling

**v3:** No built-in timeout support
**v4:** Timeout support via `RequestOptions` or context deadlines

```typescript
// Using RPCClient with timeout option
await client.request("method", params, { timeout: 5000 });

// Using RPCContextClient with context deadline
const { ctx, abort } = context.withTimeout(context.background, 5000);
try {
  await client.request(ctx, "method", params);
} finally {
  abort();
}
```

#### 3. Empty Response Handling

v4 properly handles empty responses (HTTP 204 or Content-Length: 0).

```typescript
// Returns undefined for empty responses
const result = await client.request("methodWithNoResponse", {});
// result === undefined
```

#### 4. Improved Error Content-Type Handling

Error responses now properly handle `application/json; charset=utf-8` and other content-type variations.

---

## Migrating from v2 to v3

### Breaking Changes

#### 1. Package Name Change

**v2:** `loke-http-rpc-client`
**v3:** `@loke/http-rpc-client`

**Action Required:** Update your package.json and imports:

```bash
npm uninstall loke-http-rpc-client
npm install @loke/http-rpc-client
```

```diff
- import { load } from "loke-http-rpc-client";
+ import { load } from "@loke/http-rpc-client";
```

#### 2. Node.js Version Requirement

**v2:** Node.js >= 6
**v3:** Node.js >= 8

**Action Required:** Upgrade to Node.js 8 or later.

#### 3. Enhanced Error Handling

v3 improved error handling with better error types and stack traces.

**Error properties now include:**

- `type` - Error type from the remote service
- `code` - Error code
- `expose` - Whether error should be exposed to clients
- `source` - Array tracking error propagation through services
- `instance` - Error instance identifier

```typescript
try {
  await client.request("method", params);
} catch (err) {
  console.log(err.type); // Error type
  console.log(err.code); // Error code
  console.log(err.source); // Error source chain
  console.log(err.instance); // Error instance
}
```

#### 4. prom-client Peer Dependency Updated

**v2:** `prom-client: "7.x"`
**v3:** `prom-client: ">=12"`

**Action Required:** Update prom-client:

```bash
npm install prom-client@^14
```

---

## Migrating from v1 to v2

### Breaking Changes

#### 1. Node.js Version Requirement

**v1:** Node.js >= 4
**v2:** Node.js >= 6

**Action Required:** Upgrade to Node.js 6 or later.

#### 2. Prometheus Metrics Added

v2 introduces Prometheus metrics support via `prom-client`.

**New peer dependency required:**

```bash
npm install prom-client
```

**Metrics exposed:**

- `http_rpc_client_request_duration_seconds` - Histogram of request durations
- `http_rpc_client_requests_total` - Counter of total requests
- `http_rpc_client_failures_total` - Counter of failed requests

Labels: `service`, `method`, `status_code`, `type`

```typescript
import { register } from "prom-client";

// Expose metrics endpoint in your application
app.get("/metrics", (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(register.metrics());
});
```

#### 3. POST Request Retry Behavior

**v1:** POST requests may have been retried on failure
**v2:** POST requests are never retried (to prevent duplicate operations)

**Action Required:** Implement retry logic in your application if needed, being careful about idempotency.

---

## Version Compatibility Matrix

| Version | Node.js | prom-client | @loke/context | TypeScript |
| ------- | ------- | ----------- | ------------- | ---------- |
| v5.x    | ≥ 20    | 12-15       | ≥0.0.1 (peer) | ✅ Full    |
| v4.x    | ≥ 8     | 12-14       | ≥0.0.1        | ✅ Full    |
| v3.x    | ≥ 8     | ≥12         | ❌            | ⚠️ Partial |
| v2.x    | ≥ 6     | 7.x         | ❌            | ❌         |
| v1.x    | ≥ 4     | ❌          | ❌            | ❌         |
