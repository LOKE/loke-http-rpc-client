import test, { TestContext } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { text } from "node:stream/consumers";
import { AddressInfo } from "node:net";

import * as context from "@loke/context";

import { RPCClient, RPCContextClient } from "./client";
import { RpcHTTPError } from "./error";

class TestService extends RPCClient {
  constructor(url: string) {
    super(url, "test-service");
  }
  ping(args: Record<string, unknown>) {
    return this.request("ping", args);
  }
  echo(args: Record<string, unknown>) {
    return this.request("echo", args);
  }
  drop(args: Record<string, unknown>) {
    return this.request("drop", args);
  }
}

class TestContextService extends RPCContextClient {
  constructor(url: string) {
    super(url, "test-service");
  }
  ping(ctx: context.Context, args: Record<string, unknown>) {
    return this.request(ctx, "ping", args);
  }
  echo(ctx: context.Context, args: Record<string, unknown>) {
    return this.request(ctx, "echo", args);
  }
  drop(ctx: context.Context, args: Record<string, unknown>) {
    return this.request(ctx, "drop", args);
  }
}

async function setup(t: TestContext) {
  const { close, address } = await createMockServer();
  t.after(close);

  const client = new TestService(address + "/rpc");
  const contextClient = new TestContextService(address + "/rpc");

  return { client, contextClient };
}

test("Basic success tests", async (t) => {
  const { client, contextClient } = await setup(t);

  await t.test("basic test", async () => {
    const result = await client.ping({});
    assert.equal(result, "pong");

    const contextResult = await contextClient.ping(context.background, {});
    assert.equal(contextResult, "pong");
  });

  await t.test("basic object", async () => {
    const result = await client.echo({ msg: "foo" });
    assert.deepEqual(result, { msg: "foo" });

    const contextResult = await contextClient.echo(context.background, {
      msg: "foo",
    });
    assert.deepEqual(contextResult, { msg: "foo" });
  });
});

test("Dropped connection", async (t) => {
  const { client } = await setup(t);

  await assert.rejects(client.drop({}), RpcHTTPError);
});

async function createMockServer() {
  const server = http.createServer(async (req, res) => {
    const method = req.url?.split("/").at(-1);

    let result: unknown = null;

    switch (method) {
      case "ping":
        result = "pong";
        break;
      case "echo":
        result = JSON.parse(await text(req));
        break;
      case "drop":
        req.socket.destroy();
        return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
  });

  await new Promise<void>((resolve) =>
    server.listen({ port: 0, family: "IPv4" }, () => resolve()),
  );

  const { family, address, port } = server.address() as AddressInfo;

  const addressString = family === "IPv4" ? address : `[${address}]`;

  return {
    address: `http://${addressString}:${port}`,
    close: () => server.close(),
  };
}

test("URL validation tests", async (t) => {
  await t.test(
    "should throw error for invalid URL - empty string",
    async () => {
      assert.throws(() => new TestService(""), {
        name: "Error",
        message: 'invalid baseURL in service test-service: ""',
      });
    },
  );

  await t.test("should throw error for invalid URL - malformed", async () => {
    assert.throws(() => new TestService("not-a-url"), {
      name: "Error",
      message: 'invalid baseURL in service test-service: "not-a-url"',
    });
  });

  await t.test(
    "should throw error for invalid URL - missing protocol",
    async () => {
      assert.throws(() => new TestService("example.com"), {
        name: "Error",
        message: 'invalid baseURL in service test-service: "example.com"',
      });
    },
  );

  await t.test("should throw error for invalid URL - spaces", async () => {
    assert.throws(() => new TestService("http://example .com"), {
      name: "Error",
      message: 'invalid baseURL in service test-service: "http://example .com"',
    });
  });

  await t.test("should accept valid HTTP URL", async () => {
    assert.doesNotThrow(() => new TestService("http://example.com"));
  });

  await t.test("should accept valid HTTPS URL", async () => {
    assert.doesNotThrow(() => new TestService("https://example.com"));
  });

  await t.test("should accept valid URL with port", async () => {
    assert.doesNotThrow(() => new TestService("http://localhost:3000"));
  });

  await t.test("should accept valid URL with path", async () => {
    assert.doesNotThrow(() => new TestService("https://api.example.com/v1"));
  });
});
