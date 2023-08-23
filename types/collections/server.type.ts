import CommonCollection from "./commonCollection.type.ts";

/**
 * Server collection type.
 */
export default interface Server extends CommonCollection {
  url: string;
}
