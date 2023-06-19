import CommonCollection from "./commonCollection.type.ts";

export default interface Client extends CommonCollection {
  name: string;
  telegram: string | null;
  notionPage: string | null;
}
