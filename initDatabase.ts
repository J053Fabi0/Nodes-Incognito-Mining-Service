import { connect } from "redis/mod.ts";
import { MongoClient } from "mongo/mod.ts";
import { MONGO_URI, REDIS_HOSTNAME, REDIS_PORT } from "./env.ts";

// Connect to MongoDB
export const client = new MongoClient();

await client.connect(MONGO_URI);

const isLocalhost = MONGO_URI.includes("localhost");
console.log(`Connected to ${isLocalhost ? "localhost" : "external"} MongoDB`, MONGO_URI);

const db = client.database();

export default db;

export const redis = await connect({ port: REDIS_PORT, hostname: REDIS_HOSTNAME });
