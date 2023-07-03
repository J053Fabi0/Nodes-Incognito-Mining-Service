import createDocker from "../incognito/docker/createDocker.ts";
import { createNode } from "../controllers/node.controller.ts";
import { getClient } from "../controllers/client.controller.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import createNginxConfig from "../incognito/nginx/createNginxConfig.ts";

const admin = (await getClient({ role: "admin" }, { projection: { _id: 1 } }))!;

const number = 1;
const name = "test";
const rcpPort = 8345;
const dockerIndex = 11;

await createNginxConfig(name, number, rcpPort);
await createDocker(rcpPort, "1QTKG4k1mZD195iwAD2FY5ADGzTCSFNkBhNUZ7QV2Y9TFYfvNQ", dockerIndex);

await createNode({
  name,
  number,
  rcpPort,
  dockerIndex,
  inactive: false,
  client: admin._id,
  sendTo: [admin._id],
  validator: "1QTKG4k1mZD195iwAD2FY5ADGzTCSFNkBhNUZ7QV2Y9TFYfvNQ",
  validatorPublic:
    "1AwETFmvEfRKHtwDa4KGUXQVhkQqDX8tRWi3cXnmpataSaALhXJAugCnuoRWrM1wwoUQvsHUEKwr7w8NqKriYjVaLozaLDeikbvwYVo4qDx9EEsRvLnTyhAMSNbwKTCgaAupPtSNmhYdjFVvGepk9gCgzwfuyXrR8E9w3vNFTm5Ed5xyGxKaS",
});

duplicatedFilesCleaner.dockerIndexes.push(dockerIndex);
