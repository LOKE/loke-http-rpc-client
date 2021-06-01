import test from "ava";
import httpRpcClient from "../";
import mockService from "./helpers/mock-service";

test("call ping", async (t) => {
  const { close, address } = await mockService.create();

  const client = httpRpcClient.load(address, "test-service");

  const result = await client.ping();

  t.is(result, "pong");

  await close();
});
