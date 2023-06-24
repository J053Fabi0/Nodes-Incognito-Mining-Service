import CommonCollection from "./commonCollection.type.ts";

export default interface Client extends CommonCollection {
  name: string;
  telegram: string | null;
  role: "admin" | "client";
  notionPage: string | null;
}
