const http = require("http");
const express = require("express");
const pify = require("pify");

const app = express()
  .get("/rpc", (req, res) => {
    res.json(require("../ipc_manifests/test-service"));
  })
  .post("/rpc/ping", (req, res) => {
    res.json("pong");
  })
  .post("/rpc/basicError", (req, res) => {
    res
      .status(400)
      .json({ message: "Basic error", code: "BASIC", expose: true });
  })
  .post("/rpc/lokeError", (req, res) => {
    res.status(400).json({
      instance: "01CX7CJC5T4S642MH6MJ2WES0B",
      message: "LOKE error",
      namespace: "loke_errors",
      code: "LOKE",
      type: "LOKE",
      expose: true,
      something: "else"
    });
  })
  .post("/rpc/upstreamError", (req, res) => {
    res.status(400).json({
      instance: "01CX7CJC5T4S642MH6MJ2WES0B",
      message: "Upstream error",
      code: "Upstream",
      type: "Upstream",
      source: ["upstream/callMe", "another/method"]
    });
  });

exports.create = function() {
  const server = http.createServer(app);

  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", err => {
      if (err) {
        return reject(err);
      }

      const { address, port, family } = server.address();
      const addressString = family === "IPv4" ? address : `[${address}]`;

      resolve({
        address: `http://${addressString}:${port}`,
        close: pify(server.close.bind(server))
      });
    });
  });
};
