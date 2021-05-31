import test from "ava";
import httpRpcClient from "../";

test("load client", (t) => {
  const client = httpRpcClient.load("http://localhost:6000", "test-service");

  t.is(typeof client.ping, "function");
});
