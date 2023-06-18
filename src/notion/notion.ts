import "dotenv";
import { Client } from "notion";
const notion = new Client({ auth: Deno.env.get("NOTION_KEY") });

export default notion;
