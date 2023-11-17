import setCache from "../../utils/setCache.ts";
import isError from "../../types/guards/isError.ts";
import submitNode from "../../incognito/submitNode.ts";
import validateItems from "../../utils/validateItems.ts";
import sendMessage, { sendHTMLMessage } from "../sendMessage.ts";
import duplicatedFilesCleaner from "../../duplicatedFilesCleaner.ts";
import { docker } from "../../duplicatedFilesCleaner/utils/commands.ts";
import { getNode, getNodes } from "../../controllers/node.controller.ts";
import { CommandOptions, CommandResponse } from "../submitCommandUtils.ts";
import deleteDockerAndConfigs from "../../incognito/deleteDockerAndConfigs.ts";

type Action = "start" | "stop" | "create" | "delete";
const ACTIONS = Object.freeze(["start", "stop", "create", "delete"]) satisfies readonly Action[];

function isAction(action: string): action is Action {
  return ACTIONS.includes(action as Action);
}

export default async function handleDocker(
  [action, ...rawNodes]: string[],
  options?: CommandOptions
): Promise<CommandResponse> {
  // check if the command is valid
  if (!isAction(action) || rawNodes.length === 0) {
    const error =
      "Invalid command. Use <code>start</code>, <code>stop</code>, <code>create</code> or <code>delete</code> " +
      "followed by the indexes of the nodes or <code>all</code>.";
    if (options?.telegramMessages)
      await sendHTMLMessage(error, undefined, { disable_notification: options?.silent });
    return { successful: false, error };
  }

  // remove duplicated nodes
  rawNodes.splice(0, Infinity, ...[...new Set(rawNodes)]);

  const stopOrStart = action === "start" || action === "stop";

  if (!stopOrStart && rawNodes.includes("all")) {
    const error = `You can't ${action} all the nodes.`;
    if (options?.telegramMessages)
      await sendHTMLMessage(error, undefined, { disable_notification: options?.silent });
    return { successful: false, error };
  }

  const validNodes = stopOrStart
    ? duplicatedFilesCleaner.dockerIndexes
    : (await getNodes({}, { projection: { dockerIndex: 1, _id: 0 } })).map((n) => n.dockerIndex);

  const nodes =
    rawNodes.length === 1 && rawNodes[0] === "all"
      ? duplicatedFilesCleaner.dockerIndexes
      : await validateItems({ rawItems: rawNodes, validItems: validNodes }).catch((e) => {
          if (isError(e)) return e;
          throw new Error(e);
        });

  if (isError(nodes)) return { successful: false, error: nodes.message };

  const responses: string[] = [];

  async function addResponse(action: string, node: string | number) {
    const response = `Docker <code>${node}</code> ${action === "stop" ? "stopp" : "start"}ed.`;
    if (options?.telegramMessages)
      await sendHTMLMessage(response, undefined, { disable_notification: options?.silent });
    responses.push(response);
  }

  switch (action) {
    case "start":
    case "stop": {
      for (const node of nodes) {
        setCache(node, "docker.running", action === "start");

        await docker(`inc_mainnet_${node}`, action);

        setCache(node, "docker.running", action === "start");

        await addResponse(action, node);
      }
      break;
    }

    case "create":
    case "delete": {
      const nodesInfo = await Promise.all(
        nodes.map((node) =>
          getNode(
            { dockerIndex: +node },
            {
              projection: {
                _id: 1,
                number: 1,
                client: 1,
                rcpPort: 1,
                inactive: 1,
                validator: 1,
                dockerIndex: 1,
                validatorPublic: 1,
              },
            }
          )
        )
      );

      if (nodesInfo.includes(null)) {
        const missingNodes = nodes.map((node, i) => (nodesInfo[i] ? null : node)).filter((n) => n !== null);
        const error =
          `The node${missingNodes.length === 1 ? "" : "s"} <code>${missingNodes.join("</code>, <code>")}</code> ` +
          `do${missingNodes.length === 1 ? "es" : ""}n't exist.`;
        if (options?.telegramMessages)
          await sendHTMLMessage(error, undefined, { disable_notification: options?.silent });
        return { successful: false, error };
      }

      for (const node of nodesInfo) {
        if (!node) continue;

        let response = "";
        switch (action) {
          case "create": {
            if (node.inactive === false) response = `Node <code>${node.dockerIndex}</code> is already created.`;
            else {
              await submitNode({
                cost: 0,
                nodeId: node._id,
                number: node.number,
                rcpPort: node.rcpPort,
                clientId: node.client,
                validator: node.validator,
                dockerIndex: node.dockerIndex,
                validatorPublic: node.validatorPublic,
              });
              response = `Node <code>${node.dockerIndex}</code> created.`;
            }
            break;
          }

          case "delete": {
            if (node.inactive) response = `Node <code>${node.dockerIndex}</code> is already deleted.`;
            else {
              await deleteDockerAndConfigs({
                number: node.number,
                clientId: node.client,
                dockerIndex: node.dockerIndex,
              });
              response = `Node <code>${node.dockerIndex}</code> deleted.`;
            }
          }
        }

        responses.push(response);
        if (options?.telegramMessages)
          await sendHTMLMessage(response, undefined, { disable_notification: options?.silent });
      }
    }
  }

  if (options?.telegramMessages) await sendMessage("Done.", undefined, { disable_notification: options?.silent });

  return { successful: true, response: responses.join("\n") };
}
