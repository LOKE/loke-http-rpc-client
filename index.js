'use strict';
const url = require('url');
const path = require('path');
const got = require('got');
const findUp = require('find-up');
const pFinally = require('p-finally');
const pTap = require('p-tap');

const {Histogram, Counter} = require('prom-client');

const IPC_MANIFESTS_FOLDER = 'ipc_manifests';

const requestDuration = new Histogram('http_rpc_client_request_duration_seconds', 'Duration of rpc requests from the client', ['service', 'method']);
const requestCount = new Counter('http_rpc_client_requests_total', 'The total number of rpc requests from the client', ['service', 'method']);
const failureCount = new Counter('http_rpc_client_failures_total', 'The total number of rpc failures from the client', ['service', 'method']);

exports.load = function (host, serviceName, options) {
  const metaPath = getMetaPath(serviceName);
  const client = new Client(host, options);

  return client.load(metaPath);
};

// exports.createClient = function (host, options) {
//   return new Client(host, options);
// }

function rootModuleDir() {
  let mod = module;

  while (mod.parent) {
    mod = mod.parent;
  }

  return path.dirname(mod.filename);
}

function getMetaPath(serviceName) {
  const fileName = path.join(IPC_MANIFESTS_FOLDER, `${serviceName}.json`);

  return findUp.sync(fileName, {cwd: rootModuleDir()}) || findUp.sync(fileName);
}

class Client {
  constructor(baseURL, options) {
    var parsedURL = url.parse(baseURL);
    this.protocol = parsedURL.protocol;
    this.host = parsedURL.host;
    this.port = parsedURL.port;

    Object.assign(this, {
      path: '/rpc',
    }, options);
  }

  load(metaFile) {
    if (!metaFile) {
      throw new Error('invalid metaFile path');
    }

    const meta = require(metaFile);

    return this.createInterface(meta);
  }

  request(methodName, params, timeout) {
    const requestMeta = {service: this.formatUrl(), method: methodName};
    const end = requestDuration.startTimer(requestMeta);

    requestCount.inc(requestMeta);

    const requestUrl = this.formatUrl(methodName)

    const result = got.post(requestUrl, {
      body: JSON.stringify(params),
      headers: {
        'Content-Type': 'application/json'
      },
      json: true,
      timeout,
    })
    .then(res => res.body)
    .catch(pTap.catch(() => failureCount.inc(requestMeta)))
    .catch(mapError);

    return pFinally(result, end)
  }

  formatUrl(methodName) {
    const pathname = methodName ? path.join(this.path, methodName) : this.path;

    return url.format({
      protocol: this.protocol,
      host: this.host,
      port: this.port,
      pathname: pathname
    });
  }

  getMeta() {
    const requestUrl = this.formatUrl();

    return got(requestUrl, { json: true })
    .then(res => res.body)
    .catch(mapError);
  }

  createInterface(meta) {
    const rpcInterface = {};
    const multiArg = meta.multiArg || false;
    const serviceName = meta.serviceName;
    const self = this;

    meta.interfaces.forEach(iface => {
      rpcInterface[iface.methodName] = function () {
        const args = Array.prototype.slice.call(arguments);
        const params = multiArg ? args : args[0];
        if (!multiArg && params && (typeof params !== 'object')) throw new Error('HTTP RPC expected a single arguments object, or none, simple values are not supported');
        return self.request(iface.methodName, params, iface.methodTimeout);
      };
    });
    return rpcInterface;
  }
}

function mapError(err) {
  if (err.statusCode < 500) {
    console.log(err);
    const newErr = new Error(err.response.body.message);
    newErr.code = err.response.body.code;
    throw newErr;
  }
  throw err;
}
