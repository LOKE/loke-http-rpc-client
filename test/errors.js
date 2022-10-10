import test from "ava";
import httpRpcClient from "../";
import mockService from "./helpers/_mock-service";

test("basic error -> Error", async (t) => {
  const { close, address } = await mockService.create();

  const client = httpRpcClient.load(address, "test-service");

  const err = await t.throwsAsync(client.basicError());

  t.is(err.toString(), "Error: Basic error");
  t.is(err.message, "Basic error");
  t.is(err.name, "Error");
  t.is(err.code, "BASIC");
  t.is(err.expose, true);

  await close();
});

test("LOKE error -> RpcResponseError", async (t) => {
  const { close, address } = await mockService.create();

  const client = httpRpcClient.load(address, "test-service");

  const err = await t.throwsAsync(client.lokeError());

  t.is(err.message, "LOKE error");
  t.is(err.name, "RpcResponseError");
  t.is(err.code, "LOKE");
  t.is(err.type, "LOKE");
  t.is(err.expose, true);
  t.is(err.something, "else");
  t.is(
    JSON.stringify(err),
    '{"instance":"01CX7CJC5T4S642MH6MJ2WES0B","message":"LOKE error","namespace":"loke_errors","code":"LOKE","type":"LOKE","expose":true,"something":"else","source":["test-service/lokeError"]}'
  );
  t.deepEqual(err.source, ["test-service/lokeError"]);

  await close();
});

test("LOKE error with existing source", async (t) => {
  const { close, address } = await mockService.create();

  const client = httpRpcClient.load(address, "test-service");

  const err = await t.throwsAsync(client.upstreamError());

  t.deepEqual(err.source, [
    "test-service/upstreamError",
    "upstream/callMe",
    "anotherService/anotherMethod",
  ]);

  await close();
});

// NOTE: stack traces are quite useless unless npm module trace is included
test("LOKE error stack trace", async (t) => {
  const { close, address } = await mockService.create();

  const client = httpRpcClient.load(address, "test-service");

  const err = await t.throwsAsync(client.upstreamError());

  t.is(
    err.stack,
    `RpcResponseError: Upstream error [01CX7CJC5T4S642MH6MJ2WES0B]
    via anotherService/anotherMethod
    via upstream/callMe
    via test-service/upstreamError`
  );

  await close();
});
