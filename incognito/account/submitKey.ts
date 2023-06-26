import IncognitoCli from "../IncognitoCli.ts";

interface Options {
  /** A base58-encoded ota key */
  otaKey: string;
  /** A 64-character long hex-encoded authorized access token */
  accessToken?: string;
  /** The beacon height at which the full-node will sync from (default: 0) */
  fromHeight?: number;
  /** Whether the full-node should reset the cache for this ota key (default: false) */
  isReset?: boolean;
}

export default async function submitKeyAccount(this: IncognitoCli, options: Options) {
  const args = ["account", "submitkey"];
  args.push("--otaKey", options.otaKey);
  if (options.accessToken) args.push("--accessToken", options.accessToken);
  if (options.fromHeight) args.push("--fromHeight", options.fromHeight.toString());
  if (options.isReset) args.push("--isReset");

  await this.incognitoCli(args);

  return true;
}
