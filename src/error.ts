import { format } from "node:util";

export class RpcHTTPError extends Error {}

export class RpcResponseError {
  source?: string[];

  constructor(source: string, responseBody: unknown) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { name, message, instance } = this as any;
    const meta = metaToString(this);

    return `${name}: ${message} [${instance}]${meta ? " " + meta : ""}`;
  }
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function metaToString(meta: Record<string, any>) {
  if (!meta) return "";

  return Object.keys(meta)
    .filter((k) => !EXCLUDED_META_KEYS.includes(k))
    .map((k) => format("%s=%j", k, meta[k]))
    .join(" ");
}
