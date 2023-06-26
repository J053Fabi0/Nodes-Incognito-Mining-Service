import IncognitoCli from "./IncognitoCli.ts";
import { assertEquals, assertRejects } from "std/testing/asserts.ts";

const account = {
  Index: 1,
  PrivateKey:
    "112t8rnXKE6FyYUg5iKVUk1u7PTk3SRMqGMaWaCwoWLdURQ6gAM2UKfGszKSeboxs4ZKXLLmk8zuTA6JDWPabAfaoqh43m3aZeDijkjScmVF",
  PublicKey: "12F9UnC3G7J2HoFRqJ1Vacu7GxoF9wTYXAYGhytSp2mVJMeYxoK",
  PaymentAddressV1:
    "12RzxghT3XevEet1yZZUJ98s5NxVpWs6KMYMNyqZc7XsvWFEsn61h4YZoVqphHSAxnsWfpxS7McYL72ait2GDTqKhcctKsjLY6p7W9d",
  PaymentAddress:
    "12spvUtemCbX76pTtpbDXX8Epxd86ejdaAVH4eGRHkbwYmzfLNrLDKbzxhHxbe5wp6Z8RxryQtxHkSaCwd6wDtMZRCcp29tULC4XtNctPiLLihNjto3RrrQq5j7GV96Td5GGNZAquagm4DVPM99r",
  ReadOnlyKey:
    "13hcYr5MoKjKFNYVbdjq8q7o16zh2XrcRZkAdxW9h4f7qtBe3FDWXqYfNnyL8UkW8JUT83ZeopdLem2aXXwmdP53PWXBEHreafi55ft",
  OTAPrivateKey:
    "14yE91TGZ7oiG6CyDhvByX6ivq2tEYr8XmwytwAjn1nMmG83SW2r7tvcc1SZ5uGjGEf8RxwV9quKEg2BzjhMrwWBqpKcbQzhPpXxSYf",
  MiningKey: "1283PQbdT8moY64vCi6e5YPejchuegMn8F6V3TUif9CUN5ETBFL",
  MiningPublicKey:
    "121VhftSAygpEJZ6i9jGkP3RJGnGoibgA9AcThnpUx9Rb3P3QH3jFM6bVcVzodw8CRbbceqSACWMs6dXoydLC2UNwvtkywBHRWNKcZ9mGkLJuCNLTC8D72L9i5u3jgrh5z11SrFhtQKZMg34upUNFgGDG5JbTZgqPrX2fB9udPw9T326N4qddRnGkW8jBEeebSmb5V64w83DHa88ZqTyUyCPkqwUBkU4trfbEZ9EtgFd8jbEG6a9n56P1FV2Zdfq25YVEAuTzCzMg6R3kettSMbWMsfTjrVmEs2SaYaiiBSpdDmfns16UW76CeLjcUfSxe3FJbsTUD2puQ1VteawUuGZ1hfAq7j33fU7QfkoCiY9Kvsp8PrGB2EXmZDEwdTFQh1gXzs2SkhnNcGLb6axw5Purj2HzRvueYDNqxKCNPbBaNdc",
  ValidatorPublicKey:
    "1KDoKJ697gweWZUX6AQnnbZLrtb8gtDyaT1PjYJ8QsBSJUfprm6u48bUa3MUpKi1fMbSMJPJLZY3yhM6GFzLKs4Phuip9fJbbNbZ7vDGBCSnVNeozDSmceaec6yc25WAc9ecM18d5ufzhAWhNj5AhhhTzbwuM82JM3t9Vf9Tuun4Fo2oypdTv",
  ShardID: 4,
};

Deno.test("Generate account", async () => {
  const incognitoCli = new IncognitoCli();

  const accounts = await incognitoCli.generateAccount({ shardID: 4, numAccounts: 2 });
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

Deno.test("Balance account", async (t) => {
  await t.step("Error when no private key", async () => {
    const incognitoCli = new IncognitoCli();
    await assertRejects(() => incognitoCli.balanceAccount());
  });

  await t.step("Balance account", async () => {
    const incognitoCli = new IncognitoCli(account.PrivateKey);
    const balance = await incognitoCli.balanceAccount();
    assertEquals(balance, 0);
  });
});

Deno.test("Submit key", async () => {
  const incognitoCli = new IncognitoCli();
  const result = await incognitoCli.submitKeyAccount({ otaKey: account.OTAPrivateKey });
  assertEquals(result, true);
});

Deno.test("Key info", async () => {
  const incognitoCli = new IncognitoCli(account.PrivateKey);
  const result = await incognitoCli.keyInfo();

  const { Index: _, ...noIndexAccount } = account;
  assertEquals(result, noIndexAccount);
});
