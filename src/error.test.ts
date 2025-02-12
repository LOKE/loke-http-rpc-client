import test from "node:test";
import assert from "node:assert/strict";

import { RpcResponseError } from "./error";

test("RpcResponseError", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  assert.equal(
    err.toString(),
    'RpcResponseError: foo [bar] upstreamCode=456 upstreamMessage="a bad thing happened"',
  );
  assert.equal(err.name, "RpcResponseError");
  assert.equal(err.type, "FooError");
  assert.equal(err.code, 123);
  assert.equal(err.expose, true);
  assert.equal(err.message, "foo");
  assert.equal(err.namespace, "foo");
  assert.equal(err.instance, "bar");
  assert.deepEqual(err.source, ["my_source", "foo", "bar"]);
  assert.equal(
    err.stack,
    'RpcResponseError: foo [bar] upstreamCode=456 upstreamMessage="a bad thing happened"\n    via bar\n    via foo\n    via my_source',
  );
  assert.equal(err.upstreamCode, 456);
  assert.equal(err.upstreamMessage, "a bad thing happened");
});
