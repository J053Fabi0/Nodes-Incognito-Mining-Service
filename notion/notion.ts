import { Client } from "notion/mod.ts";
import { NOTION_KEY } from "../env.ts";

const notion = new Client({ auth: NOTION_KEY });

export default notion;
