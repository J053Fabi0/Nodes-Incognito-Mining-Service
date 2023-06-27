import { MongoClient } from "mongo/mod.ts";
import { MONGO_URI } from "./env.ts";

// Connect to MongoDB
export const client = new MongoClient();

await client.connect(MONGO_URI);

console.log("Connected to MongoDB", MONGO_URI);

const db = client.database();

export default db;
