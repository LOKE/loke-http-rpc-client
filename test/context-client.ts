import test from "ava";
import { RPCContextClient } from "../";
import mockService from "./helpers/_mock-service";
import { Context } from "@loke/context";
import * as context from "@loke/context";

class TestService extends RPCContextClient {
  constructor(url: string) {
    super(url, "test-service");
  }
  ping(ctx: Context, args: any) {
    return this.request(ctx, "ping", args);
  }
  echo(ctx: Context, args: any) {
    return this.request(ctx, "echo", args);
  }
  basicError(ctx: Context, args: any) {
    return this.request(ctx, "basicError", args);
  }
  lokeError(ctx: Context, args: any) {
    return this.request(ctx, "lokeError", args);
  }
  upstreamError(ctx: Context, args: any) {
    return this.request(ctx, "upstreamError", args);
  }
}

test("RPCContextClient", async (t) => {
  const { close, address } = await mockService.create();

  const client = new TestService(address + "/rpc");

  const result = await client.ping(context.background, {});

  t.is(result, "pong");

  const { msg } = await client.echo(context.background, { msg: "hello" });

  t.is(msg, "hello");

  await close();
});
