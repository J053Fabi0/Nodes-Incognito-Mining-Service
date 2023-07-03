import createDocker from "../incognito/createDocker.ts";
import { createNode } from "../controllers/node.controller.ts";
import { getClient } from "../controllers/client.controller.ts";

const a = await createDocker(8345, "1QTKG4k1mZD195iwAD2FY5ADGzTCSFNkBhNUZ7QV2Y9TFYfvNQ", 11);
console.log(a);

const admin = (await getClient({ role: "admin" }))!;

await createNode({
  number: 1,
  name: "test",
  rcpPort: 8345,
  dockerIndex: 11,
  inactive: false,
  client: admin._id,
  sendTo: [admin._id],
  validator: "1QTKG4k1mZD195iwAD2FY5ADGzTCSFNkBhNUZ7QV2Y9TFYfvNQ",
  validatorPublic:
    "1AwETFmvEfRKHtwDa4KGUXQVhkQqDX8tRWi3cXnmpataSaALhXJAugCnuoRWrM1wwoUQvsHUEKwr7w8NqKriYjVaLozaLDeikbvwYVo4qDx9EEsRvLnTyhAMSNbwKTCgaAupPtSNmhYdjFVvGepk9gCgzwfuyXrR8E9w3vNFTm5Ed5xyGxKaS",
});
