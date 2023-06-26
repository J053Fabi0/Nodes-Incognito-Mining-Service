import IncognitoCli from "./IncognitoCli.ts";
import { assertEquals } from "std/testing/asserts.ts";

Deno.test("Generate account", async () => {
  const incognitoCli = new IncognitoCli();

  const accounts = await incognitoCli.generateAccount({
    shardID: 4,
    numAccounts: 2,
  });

  const keys = Object.keys(accounts);

  assertEquals(keys, ["Mnemonic", "Accounts"]);
  assertEquals(accounts.Accounts.length, 2, "Should generate 2 accounts");

  const [account] = accounts.Accounts;
  const accountKeys = Object.keys(account);

  assertEquals(accountKeys, [
    "Index",
    "PrivateKey",
    "PublicKey",
    "PaymentAddressV1",
    "PaymentAddress",
    "ReadOnlyKey",
    "OTAPrivateKey",
    "MiningKey",
    "MiningPublicKey",
    "ValidatorPublicKey",
    "ShardID",
  ]);
});
