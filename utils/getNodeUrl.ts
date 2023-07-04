import { WEBSITE_URL } from "../env.ts";

const { hostname } = new URL(WEBSITE_URL);

export default function getNodeUrl(name: string) {
  return `http://${name}.${hostname}`;
}
