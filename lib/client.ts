import fetch from "node-fetch";
import * as context from "@loke/context";

import { requestDuration, requestCount, failureCount } from "./metrics";

export interface RequestOptions {
  timeout?: number;
}

class BaseClient {
  private baseURL: URL;
  private serviceName: string;
  private service: string;

  constructor(baseURL: string, serviceName: string) {
    if (!baseURL.endsWith("/")) {
      baseURL += "/";
    }
    this.serviceName = serviceName;
    this.baseURL = new URL(baseURL);
    this.service = this.baseURL.toString().replace(/\/^/, "");
  }

  protected async doRequest(
    ctx: context.Context,
    methodName: string,
    params: Record<string, any>
  ) {
    const url = new URL(methodName, this.baseURL);

    const requestMeta = { service: this.service, method: methodName };
    const end = requestDuration.startTimer(requestMeta);
    requestCount.inc(requestMeta);

    let abortable: context.Abortable | null = null;
    if (!ctx.deadline) {
      abortable = context.withTimeout(ctx, 60000);
      ctx = abortable.ctx;
    }

    let status = -1;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const reqId = context.getRequestId(ctx);
      if (reqId) {
        headers["X-Request-ID"] = reqId;
      }

      if (ctx.deadline) {
        headers["X-Request-Deadline"] = new Date(ctx.deadline).toISOString();
      }

      const res = await fetch(url.toString(), {
        method: "POST",
        body: JSON.stringify(params),
        headers,
        // AbortSignal signal type is inconsistent between libs,
        // it is a built-in type so we don't really need that much type safety here
        signal: ctx.signal as any,
      });

      if (res.ok) {
        // handle the 204(ish) case
        if (res.status === 204 || res.headers.get("content-length") === "0") {
          return undefined;
        }

        return await res.json();
      }

      status = res.status;

      let errResult;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        errResult = await res.json();
      } else {
        errResult = {
          expose: false,
          message: await res.text(),
        };
      }
      mapError(this.serviceName, methodName, errResult);
    } catch (err: any) {
      failureCount.inc({ ...requestMeta, status_code: status, type: err.type });
      throw err;
    } finally {
      if (abortable) {
        abortable.abort();
      }
      end();
    }
  }
}

function mapError(serviceName: string, methodName: string, errResult: any) {
  const source = `${serviceName}/${methodName}`;

  if (!errResult.type) {
    const newErr: any = new Error(errResult.message);
    newErr.code = errResult.code;
    newErr.expose = errResult.expose;
    newErr.source = [source];
    throw newErr;
  }

  throw new RpcResponseError(source, errResult);
}

const EXCLUDED_META_KEYS = [
  "type",
  "code",
  "expose",
  "message",
  "namespace",
  "instance",
  "source",
];

function logfmt(data: Record<string, any>) {
  // taken from https://github.com/csquared/node-logfmt/blob/master/lib/stringify.js
  // cleaned up a little
  let line = "";

  for (const key in data) {
    if (EXCLUDED_META_KEYS.includes(key)) continue;

    let value = data[key];
    const is_null = value == null;
    if (is_null) {
      value = "";
    } else {
      value = value.toString();
    }

    const needs_quoting = value.indexOf(" ") > -1 || value.indexOf("=") > -1;
    const needs_escaping = value.indexOf('"') > -1 || value.indexOf("\\") > -1;

    if (needs_escaping) value = value.replace(/["\\]/g, "\\$&");
    if (needs_quoting || needs_escaping) value = '"' + value + '"';
    if (value === "" && !is_null) value = '""';

    line += key + "=" + value + " ";
  }

  // trim trailing space
  return line.substring(0, line.length - 1);
}

export class RpcResponseError {
  source?: string[];

  constructor(source: string, responseBody: any) {
    Object.defineProperty(this, "name", {
      configurable: true,
      enumerable: false,
      value: this.constructor.name,
      writable: true,
    });

    // .message .code .type .expose .instance .type are applied here
    Object.assign(this, responseBody);

    this.source = [source, ...(this.source || [])];

    Object.defineProperty(this, "stack", {
      configurable: true,
      enumerable: false,
      value:
        this.toString() +
        "\n" +
        [...this.source]
          .reverse()
          .map((s) => "    via " + s)
          .join("\n"),
      writable: true,
    });
  }

  toString() {
    // defineProperty not recognized by typescript, nor is the result of assign recognizable
    const { name, message, instance } = this as any;
    const meta = logfmt(this);

    return `${name}: ${message} [${instance}]${meta ? " " + meta : ""}`;
  }
}

export class RPCClient extends BaseClient {
  async request(
    methodName: string,
    params: Record<string, any>,
    options: RequestOptions = {}
  ) {
    if (!options.timeout) {
      return super.doRequest(context.background, methodName, params);
    }

    const { ctx, abort } = context.withTimeout(
      context.background,
      options.timeout
    );

    try {
      return super.doRequest(ctx, methodName, params);
    } finally {
      abort();
    }
  }
}

export class RPCContextClient extends BaseClient {
  async request(
    ctx: context.Context,
    methodName: string,
    params: Record<string, any>
  ) {
    return super.doRequest(ctx, methodName, params);
  }
}
