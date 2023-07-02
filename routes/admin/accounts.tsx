import { qrcode } from "qrcode";
import State from "../../types/state.type.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import Typography from "../../components/Typography.tsx";
import { aggregateClient } from "../../controllers/client.controller.ts";
import { toFixedS } from "../../utils/numbersString.ts";
import cryptr from "../../utils/cryptrInstance.ts";

const styles = {
  td: "border border-slate-300 py-2 px-3 overflow-x-auto",
};

interface AccountsProps {
  privateKeys: {
    name: string;
    image: string;
    address: string;
    balance: number;
  }[];
}

export const handler: Handlers<AccountsProps, State> = {
  async GET(_, ctx) {
    const accounts = (await aggregateClient([
      // populate the user's account
      {
        $lookup: {
          from: "accounts",
          localField: "account",
          foreignField: "_id",
          as: "account",
        },
      },
      // flatten the account array
      { $unwind: "$account" },
      // project the private key and the balance
      {
        $project: {
          "_id": 0,
          "name": 1,
          "account.balance": 1,
          "account.privateKey": 1,
        },
      },
    ])) as unknown as {
      name: string;
      account: { privateKey: string; balance: number };
    }[];

    const privateKeys: AccountsProps["privateKeys"] = [];
    for (const { name, account } of accounts)
      privateKeys.push({
        name,
        image: await qrcode(account.privateKey, { size: 200, errorCorrectLevel: "L" }),
        balance: account.balance,
        address: await cryptr.decrypt(account.privateKey),
      });

    return ctx.render({ privateKeys });
  },
};

export default function Accounts({ data }: PageProps<AccountsProps>) {
  const total = toFixedS(data.privateKeys.reduce((acc, { balance }) => acc + balance, 0) / 1e9, 9);

  return (
    <>
      <Typography variant="h1" class="mt-3 mb-5">
        Accounts - <code>{total}</code> PRV
      </Typography>

      <div class="overflow-x-auto">
        <table class="table-auto border-collapse border border-slate-400 w-full max-w-full">
          <thead>
            <tr>
              <th class="border border-slate-400 px-4 py-2">Name</th>
              <th class="border border-slate-400 px-4 py-2">Balance</th>
              <th class="border border-slate-400 px-4 py-2">PrivateKey</th>
              <th class="border border-slate-400 px-4 py-2">QR</th>
            </tr>
          </thead>

          <tbody>
            {data.privateKeys
              .sort((a, b) => b.balance - a.balance)
              .map(({ name, image, address, balance }) => (
                <tr class="h-[200px]">
                  <td class={styles.td}>{name}</td>
                  <td class={styles.td}>
                    <Typography variant="h3">
                      <code>{toFixedS(balance / 1e9, 9)}</code>
                    </Typography>
                  </td>
                  <td class={styles.td + " overflow-x-auto max-w-[200px]"}>{address}</td>
                  <td class={styles.td + " min-w-[200px]"}>
                    <img src={image} alt="QR" />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
