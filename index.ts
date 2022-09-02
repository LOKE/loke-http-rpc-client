export { RPCClient } from "./lib/client";

import { load as _load } from "./lib/legacy";

export const load = _load;

export default { load };
