import { API_KEY } from "../env.ts";
import { compare, hash } from "bcrypt";
import { createExtension, Exception } from "cheetah";

const keyHash = await hash(API_KEY);

const auth = createExtension({
  onRequest: async (c) => {
    if (c.req.headers.get("api-key") === undefined) throw new Exception("API key is not provided");
    if (!(await compare(c.req.headers.get("api-key")!, keyHash))) throw new Exception("API key is invalid");
  },
});

export default auth;
