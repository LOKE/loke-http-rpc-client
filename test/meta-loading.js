import test from "ava";
import { registry } from "../";

test("load client", (t) => {
  const client = registry.load("http://localhost:6000", "test-service");

  t.is(typeof client.ping, "function");
});
