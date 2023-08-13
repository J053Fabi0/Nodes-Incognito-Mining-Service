import setCache from "../../utils/setCache.ts";
import isError from "../../types/guards/isError.ts";
import { docker } from "duplicatedFilesCleanerIncognito";
import validateItems from "../../utils/validateItems.ts";
import sendMessage, { sendHTMLMessage } from "../sendMessage.ts";
import duplicatedFilesCleaner from "../../duplicatedFilesCleaner.ts";
import { CommandOptions, CommandResponse } from "../submitCommandUtils.ts";

export default async function handleDocker(
  [action, ...rawNodes]: string[],
  options?: CommandOptions
): Promise<CommandResponse> {
  // check if the command is valid
  if ((action !== "start" && action !== "stop") || rawNodes.length === 0) {
    const error =
      "Invalid command. Use <code>start</code> or <code>stop</code> followed by the indexes of the nodes or <code>all</code>.";
    if (options?.telegramMessages)
      await sendHTMLMessage(error, undefined, { disable_notification: options?.silent });
    return { successful: false, error };
  }

  const nodes =
    rawNodes.length === 1 && rawNodes[0] === "all"
      ? duplicatedFilesCleaner.dockerIndexes
      : await validateItems({ rawItems: rawNodes }).catch((e) => {
          if (isError(e)) return e;
          else throw e;
        });

  if (isError(nodes)) return { successful: false, error: nodes.message };

  const responses: string[] = [];

  for (const node of nodes) {
    setCache(node, "docker.running", action === "start");

    await docker(`inc_mainnet_${node}`, action);

    setCache(node, "docker.running", action === "start");

    const response = `Docker <code>${node}</code> ${action === "stop" ? "stopp" : "start"}ed.`;
    if (options?.telegramMessages)
      await sendHTMLMessage(response, undefined, { disable_notification: options?.silent });
    responses.push(response);
  }

  if (options?.telegramMessages) await sendMessage("Done.", undefined, { disable_notification: options?.silent });

  return { successful: true, response: responses.join("\n") };
}
