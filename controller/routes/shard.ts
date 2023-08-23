import { Collection } from "cheetah";
import deleteShards from "../controllers/deleteShards.ts";

const shardRoutes = new Collection();

shardRoutes.delete("/shards", deleteShards);

export default shardRoutes;
