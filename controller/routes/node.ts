import { Collection } from "cheetah";
import createNode from "../controllers/createNode/createNode.ts";

const nodeRoutes = new Collection();

nodeRoutes.post("/node", createNode);

export default nodeRoutes;
