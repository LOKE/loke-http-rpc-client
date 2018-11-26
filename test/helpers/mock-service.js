const http = require("http");
const express = require("express");
const pify = require("pify");

const app = express()
  .get("/rpc", (req, res) => {
    res.json(require("../ipc_manifests/test-service"));
  })
  .post("/rpc/ping", (req, res) => {
    res.json("pong");
  });

exports.create = function() {
  const server = http.createServer(app);

  return new Promise((resolve, reject) => {
    server.listen(0, err => {
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
