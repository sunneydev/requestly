import type { RequestsOptions } from "./types";
import { Requests } from "./requests";

function createRequests(opts?: RequestsOptions) {
  return new Requests(opts);
}

export default { create: createRequests };
