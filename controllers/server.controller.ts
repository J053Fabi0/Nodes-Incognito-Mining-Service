import * as a from "./dbUtils.ts";
import { lodash as _ } from "lodash";
import Model from "../models/server.model.ts";
import { countNodes } from "./node.controller.ts";
import Server from "../types/collections/server.type.ts";

export const getServers = a.find(Model);
export const getServer = a.findOne(Model);
export const getServerById = a.findById(Model);

export const countServers = a.count(Model);

export const createServer = a.insertOne(Model);
export const createServers = a.insertMany(Model);

export const changeServer = a.updateOne(Model);
export const changeServers = a.updateMany(Model);

export const deleteServer = a.deleteOne(Model);
export const deleteServers = a.deleteMany(Model);

export const aggregateServer = a.aggregate(Model);

export async function getServerWithLessNodes() {
  const servers = await getServers();

  const serversWithNodesCount: [Server, number][] = [];
  await Promise.all(
    servers
      .map((server) => async () => {
        const nodeCount = await countNodes({ server: server._id });
        serversWithNodesCount.push([server, nodeCount]);
      })
      .map((fn) => fn())
  );

  const minServer = _.minBy(serversWithNodesCount, ([, c]) => c);
  return minServer![0];
}
