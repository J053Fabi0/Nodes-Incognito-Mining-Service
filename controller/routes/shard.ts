import { Collection } from "cheetah";
import { deleteShards } from "../controllers/shard.controller.ts";

const shardRoutes = new Collection();

shardRoutes.delete("/shards", deleteShards);

export default shardRoutes;
