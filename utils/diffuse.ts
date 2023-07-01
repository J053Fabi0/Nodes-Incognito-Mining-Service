import { createNode } from "../controllers/node.controller.ts";
import { getClient } from "../controllers/client.controller.ts";
import { adminId } from "../constants.ts";

const client = await getClient({ name: "Slabb" }, { projection: { _id: 1 } });

if (!client) {
  console.log("Ho, ve");
  Deno.exit(1);
}

await createNode({
  name: "slabb_10",
  client: client._id,
  dockerIndex: 10,
  inactive: false,
  number: 11,
  sendTo: [adminId],
  validator: "1yUBmPWnY4DbgWAEQZVNuECFGLE6Bn1FdgTUnZzNS9ht9Y6MgR",
  validatorPublic:
    "1XfU9xQmZostUS9eXpnzbz9MYvC7oBkAdpQFtvdZwVW2CUzVmnemgi7hPrKBPYgvYpMczYBF7xVh3eF8SkRyGSXaeQeQY56Lex2KAWFWvQguskpLEpXZv7R1HRTweqgwdKPt3uweiwGwFzm8djSEZRu43cfdnmknzsERyw9VWp6PDYZEghvK6",
});
