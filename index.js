'use strict';
const url = require('url');
const path = require('path');
const got = require('got');
const findUp = require('find-up');

const IPC_MANIFESTS_FOLDER = 'ipc_manifests';

exports.load = function (host, serviceName, options) {
  const metaPath = getMetaPath(serviceName);
  const client = new Client(host, options);

  return client.load(metaPath);
};

exports.createClient = function (host, options) {
  return new Client(host, options);
}

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
  constructor(host, options) {
    this.host = host;

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
    const requestUrl = url.format({
      hostname: this.host,
      path: path.join(this.path, methodName)
    });

    return got.post(requestUrl, {
      body: JSON.stringify(params),
      headers: {
        'Content-Type': 'application/json'
      },
      json: true,
      timeout,
    })
    .then(res => res.body)
    .catch(res => {
      if (res.status < 500) {
        const err = new Error(res.body.message);
        err.code =req.body.code;
        throw err;
      }
      throw res;
    });
  }

  getMeta() {
    const requestUrl = url.format({
      hostname: this.host,
      path: this.path
    });

    return got(requestUrl, { json: true })
    .then(res => res.body)
    .catch(res => {
      if (res.status < 500) {
        const err = new Error(res.body.message);
        err.code =req.body.code;
        throw err;
      }
      throw res;
    });
  }

  createInterface(meta) {
    const rpcInterface = {};
    const multiArgs = meta.multiArgs || false;
    const serviceName = meta.serviceName;

    meta.interfaces.forEach(iface => {
      rpcInterface[iface.methodName] = () => {
        const args = Array.prototype.slice.call(arguments);
        const params = multiArgs ? args :  args[0];

        return this.request(iface.methodName, params, iface.methodTimeout);
      };
    });

    return rpcInterface;
  }
}
