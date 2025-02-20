/* eslint-disable @typescript-eslint/no-explicit-any */
import * as context from "@loke/context";

import { requestDuration, requestCount, failureCount } from "./metrics";
import { RpcHTTPError, RpcResponseError } from "./error";

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
    params: Record<string, unknown>,
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

      let res;
      try {
        res = await fetch(url.toString(), {
          method: "POST",
          body: JSON.stringify(params),
          headers,
          signal: ctx.signal,
        });
      } catch (err: any) {
        if (err.name === "AbortError") {
          throw err;
        }

        throw new RpcHTTPError(
          `request failed [${this.service}].${methodName}`,
          {
            cause: err,
          },
        );
      }

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

export class RPCClient extends BaseClient {
  async request(
    methodName: string,
    params: Record<string, unknown>,
    options: RequestOptions = {},
  ): Promise<any> {
    if (!options.timeout) {
      return super.doRequest(context.background, methodName, params);
    }

    const { ctx, abort } = context.withTimeout(
      context.background,
      options.timeout,
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
    params: Record<string, unknown>,
  ): Promise<any> {
    return super.doRequest(ctx, methodName, params);
  }
}
