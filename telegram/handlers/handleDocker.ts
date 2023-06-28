import isError from "../../types/guards/isError.ts";
import { CommandResponse } from "../submitCommand.ts";
import validateItems from "../../utils/validateItems.ts";
import { docker } from "duplicatedFilesCleanerIncognito";
import sendMessage, { sendHTMLMessage } from "../sendMessage.ts";
import duplicatedFilesCleaner from "../../duplicatedFilesCleaner.ts";

export default async function handleDocker([action, ...rawNodes]: string[]): Promise<CommandResponse> {
  // check if the command is valid
  if ((action !== "start" && action !== "stop") || rawNodes.length === 0) {
    const error =
      "Invalid command. Use <code>start</code> or <code>stop</code> followed by the indexes of the nodes or <code>all</code>.";
    await sendHTMLMessage(error);
    return { successful: false, error };
  }

  const nodes =
    rawNodes.length === 1 && rawNodes[0] === "all"
      ? duplicatedFilesCleaner.usedNodes
      : await validateItems({ rawItems: rawNodes }).catch((e) => {
          if (isError(e)) return e;
          else throw e;
        });

  if (isError(nodes)) return { successful: false, error: nodes.message };

  const responses: string[] = [];

  for (const node of nodes) {
    await docker(`inc_mainnet_${node}`, action);

    const response = `Docker <code>${node}</code> ${action === "stop" ? "stopp" : "start"}ed.`;
    await sendHTMLMessage(response);
    responses.push(response);
  }

  await sendMessage("Done.");

  return { successful: true, response: responses.join("\n") };
}
