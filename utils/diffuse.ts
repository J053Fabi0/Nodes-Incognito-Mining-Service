import constants, { adminId } from "../constants.ts";
import createDocker from "../incognito/docker/createDocker.ts";
import { createNode } from "../controllers/node.controller.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import createNginxConfig from "../incognito/nginx/createNginxConfig.ts";

const number = 1;
const name = "test";
const rcpPort = 8345;
const dockerIndex = 11;
const validatorPublic =
  "1AwETFmvEfRKHtwDa4KGUXQVhkQqDX8tRWi3cXnmpataSaALhXJAugCnuoRWrM1wwoUQvsHUEKwr7w8NqKriYjVaLozaLDeikbvwYVo4qDx9EEsRvLnTyhAMSNbwKTCgaAupPtSNmhYdjFVvGepk9gCgzwfuyXrR8E9w3vNFTm5Ed5xyGxKaS";

await createNginxConfig(name, number, rcpPort);
await createDocker(rcpPort, "1QTKG4k1mZD195iwAD2FY5ADGzTCSFNkBhNUZ7QV2Y9TFYfvNQ", dockerIndex);

await createNode({
  name,
  number,
  rcpPort,
  dockerIndex,
  validatorPublic,
  inactive: false,
  client: adminId,
  sendTo: [adminId],
  validator: "1QTKG4k1mZD195iwAD2FY5ADGzTCSFNkBhNUZ7QV2Y9TFYfvNQ",
});

// Update configurations
duplicatedFilesCleaner.dockerIndexes.push(dockerIndex);
constants.push({
  name,
  dockerIndex,
  validatorPublic,
});
