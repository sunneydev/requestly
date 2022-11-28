import { Requests } from "./requests";

type Options = ConstructorParameters<typeof Requests>[number];

function createRequests(opts?: Options) {
  return new Requests(opts);
}

export default { create: createRequests };
