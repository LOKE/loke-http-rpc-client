import { Histogram, Counter } from "prom-client";

export const requestDuration = new Histogram({
  name: "http_rpc_client_request_duration_seconds",
  help: "Duration of rpc requests from the client",
  labelNames: ["service", "method"],
});

export const requestCount = new Counter({
  name: "http_rpc_client_requests_total",
  help: "The total number of rpc requests from the client",
  labelNames: ["service", "method"],
});

export const failureCount = new Counter({
  name: "http_rpc_client_failures_total",
  help: "The total number of rpc failures from the client",
  labelNames: ["service", "method", "type", "status_code"],
});
