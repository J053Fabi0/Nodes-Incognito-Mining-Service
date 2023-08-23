import { Collection } from "cheetah";
import deleteShards from "../controllers/deleteShards.ts";
import copyOrMoveShards from "../controllers/copyOrMoveShards.ts";

const shardRoutes = new Collection();

shardRoutes.delete("/shards", deleteShards);
shardRoutes.post("/shards", copyOrMoveShards);

export default shardRoutes;
