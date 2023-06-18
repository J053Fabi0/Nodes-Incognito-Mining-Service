import CommonCollection from "./commonCollection.type.ts";

export default interface Client extends CommonCollection {
  telegram: string | null;
  notionPage: string;
}
