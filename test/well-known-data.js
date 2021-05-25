import test from "ava";
import sinon from "sinon";
import { Registry } from "../";

test("returns list of loaded services", async (t) => {
  const registry = new Registry();

  registry.load("localhost", "test-service");

  const wellKnownHandler = registry.createWellKnownHandler();

  const mockRes = {
    json: sinon.spy(),
  };

  wellKnownHandler(null, mockRes);

  t.true(mockRes.json.calledOnce);

  t.deepEqual(mockRes.json.getCall(0).args[0], {
    services: [{ name: "test-service" }],
  });
});
