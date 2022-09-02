import { AbortController } from "node-abort-controller";
import fetch from "node-fetch";

import { requestDuration, requestCount, failureCount } from "./metrics";

interface RequestOptions {
  timeout?: number;
}

export class RPCClient {
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
  async request(
    methodName: string,
    params: Record<string, any>,
    options: RequestOptions = {}
  ) {
    const url = new URL(methodName, this.baseURL);

    const requestMeta = { service: this.service, method: methodName };
    const end = requestDuration.startTimer(requestMeta);
    requestCount.inc(requestMeta);

    const { timeout = 60000 } = options;

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeout);

    let status = -1;
    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        body: JSON.stringify(params),
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(tid);

      if (res.ok) {
        return res.json();
      }

      status = res.status;

      let errResult;
      if (res.headers.get("content-type") === "application/json") {
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

class RpcResponseError {
  source?: string[];

  constructor(source: string, responseBody: any) {
    Object.defineProperty(this, "name", {
      configurable: true,
      enumerable: false,
      value: this.constructor.name,
      writable: true,
    });

    Object.assign(this, responseBody);
    if (!this.source) this.source = [];
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
}
