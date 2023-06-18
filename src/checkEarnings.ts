import axiod from "axiod";
import { sleep } from "sleep";
import nodes from "./utils/nodes.ts";
import clients from "./utils/clients.ts";
import sendMessage from "./sendMessage.ts";
import constants from "./utils/constants.ts";
import NodeEarning from "./types/nodeEarning.type.ts";
import NodeStatus from "./types/nodesStatuses.type.ts";
import uploadToNotion from "./notion/uploadToNotion.ts";
import repeatUntilNoError from "./utils/repeatUntilNoError.ts";

const { prvDecimalsDivisor } = constants;

const second = 1;
const minute = second * 60;

const nodesToSkip: string[] = [];
function repeatUntilNoError55<T>(cb: (() => T) | (() => Promise<T>)) {
  return repeatUntilNoError<T>(cb, 5, 5);
}

export const prvMode = async () => {
  while (true) {
    try {
      // Get nodes status
      const { data: nodesStatus } = await repeatUntilNoError55(() =>
        axiod.post<NodeStatus[]>("https://monitor.incognito.org/pubkeystat/stat", {
          mpk: nodes.map((a) => a.validatorPublic).join(","),
        })
      );

      for (const nodeStatus of nodesStatus) {
        const { name, validatorPublic, sendTo, owner, number } = nodes.find(
          (n) => n.validatorPublic === nodeStatus.MiningPubkey
        )!;

        const { data: nodeEarnings } = await repeatUntilNoError55(() =>
          axiod.post<NodeEarning[]>("https://monitor.incognito.org/pubkeystat/committee", {
            mpk: validatorPublic,
          })
        );

        for (const nodeEarning of nodeEarnings) {
          // If the earning is not complete, don't count it yet
          if (!("Reward" in nodeEarning) || typeof nodeEarning.Reward !== "number") continue;

          const { Epoch, Reward, Time } = nodeEarning;

          // If no earing, continue.
          if (Reward === 0) continue;
          // If the earingn is alredy registered, continue.
          // if (earningsDB.findOne({ name, epoch: Epoch })) continue;

          await repeatUntilNoError55(() =>
            uploadToNotion(clients[owner].notion_page, Epoch, new Date(Time), Reward / prvDecimalsDivisor, number)
          );

          // Send messages to the destination users
          for (const ownerID of sendTo)
            await repeatUntilNoError55(() =>
              sendMessage(
                `#${name} - <code>${Reward / prvDecimalsDivisor}</code>.\n` +
                  `Epoch: <code>${Epoch}</code>.\n` +
                  `To come: <code>${nodeStatus.NextEventMsg.split(" ")[0]}</code>.`,
                clients[ownerID].telegram,
                { parse_mode: "HTML" }
              )
            );
        }

        // Wait a bit, to not overload the monitor's API
        await sleep(second);
      }
    } catch (e) {
      if ("message" in e && e.message) console.error("Message:", e.message);
      else console.error(e);

      if (e?.message?.endsWith("Temporary failure in name resolution")) return;

      sendMessage("Error general.", "861616600");
    } finally {
      if (nodesToSkip.length) {
        console.log("Esperando hasta que no haya nodos enviando PRV.");
        while (nodesToSkip.length >= 1) await sleep(second);
      } else {
        console.log("Esperando 5 minutos.");
        await sleep(minute * 5);
      }
    }
  }
};
