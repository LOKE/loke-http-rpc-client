import test from "ava";

import { RpcResponseError } from "../lib/client";

test("RpcResponseError", (t) => {
  const err: any = new RpcResponseError("my_source", {
    type: "FooError",
    code: 123,
    expose: true,
    message: "foo",
    namespace: "foo",
    instance: "bar",
    source: ["foo", "bar"],
    upstreamCode: 456,
    upstreamMessage: "a bad thing happened",
  });

  t.is(
    err.toString(),
    'RpcResponseError: foo [bar] upstreamCode=456 upstreamMessage="a bad thing happened"'
  );
  t.is(err.name, "RpcResponseError");
  t.is(err.type, "FooError");
  t.is(err.code, 123);
  t.is(err.expose, true);
  t.is(err.message, "foo");
  t.is(err.namespace, "foo");
  t.is(err.instance, "bar");
  t.deepEqual(err.source, ["my_source", "foo", "bar"]);
  t.is(
    err.stack,
    'RpcResponseError: foo [bar] upstreamCode=456 upstreamMessage="a bad thing happened"\n    via bar\n    via foo\n    via my_source'
  );
  t.is(err.upstreamCode, 456);
  t.is(err.upstreamMessage, "a bad thing happened");
});
