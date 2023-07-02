import IncognitoCli from "../IncognitoCli.ts";

export default async function send(
  this: IncognitoCli,
  address: string,
  amount: number,
  tokenId = IncognitoCli.PRV_ID
): Promise<string | null> {
  if (!this.privateKey) throw new Error("privateKey is not set");

  const args = [
    ...["send"],
    ...["--privateKey", this.privateKey],
    ...["--address", address],
    ...["--amount", amount.toString()],
    ...["--tokenID", tokenId],
    ...["--version", "2"],
  ];

  const a: string = await this.incognitoCli(args);

  // remove the first line of the string and parse to JSON
  const lines = JSON.parse(a.split("\n").slice(1).join("\n")) as { TxHash: string };

  return (lines || {}).TxHash ?? null;
}
