import IncognitoCli from "../IncognitoCli.ts";

export default async function send(
  this: IncognitoCli,
  address: string,
  amount: number,
  tokenId = IncognitoCli.PRV_ID
) {
  if (!this.privateKey) throw new Error("privateKey is not set");

  const args = [
    ...["send"],
    ...["--privateKey", this.privateKey],
    ...["--address", address],
    ...["--amount", amount.toString()],
    ...["--tokenID", tokenId],
    ...["--version", "2"],
  ];

  const a = await this.incognitoCli(args);

  return a;
}
