# loke-http-rpc-client

## Breaking Changes for v5

Services are now required to be loaded through registry

### Migrating from v3 to v5

- Added new well know handler ("createWellKnownMetaHandler()") that serves service metadata
- Exposing well-known URL for uniformity across the system to access service metadata

### v3:

```js
const rpc = require("loke-http-rpc-client");

const myService = {
    url: "http://localhost:9998"
    name: "some-servie"
    path: "/rpc/some-service"
}

const rpcClient = rpc.load(myService.url, myService.name, { path: myService.path });

app.use("/rpc", rpcClient);
```

### v5:

```js
const { registry, WELL_KNOWN_META_PATH } = require("loke-http-rpc-client");

const myService = {
    url: "http://localhost:9998"
    name: "some-servie"
    path: "/rpc/some-service"
}

const rpcClient = registry.load(myService.url, myService.name, { path: myService.path });

app.use("/rpc", rpcClient);
app.get(WELL_KNOWN_META_PATH, registry.createWellKnownMetaHandler());
```
