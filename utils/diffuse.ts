import fixLowDiskSpace from "../incognito/fixLowDiskSpace.ts";
import { changeNodes } from "../controllers/node.controller.ts";
import { createServer, getServerWithLessNodes, getServers } from "../controllers/server.controller.ts";

export default async function diffuse() {
  await fixLowDiskSpace(false, 2);
}

if ((await getServers()).length === 0) await createServer({ url: "https://server1.josefabio.com" });

const server = await getServerWithLessNodes();
await changeNodes({ server: { $exists: false } }, { $set: { server: server._id } });
