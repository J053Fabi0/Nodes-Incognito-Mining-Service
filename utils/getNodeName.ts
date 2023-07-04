import { ObjectId } from "mongo/mod.ts";

export default function getNodeName(clientId: string | ObjectId, number: number): string {
  return `${number}-${clientId}`.toLowerCase();
}
