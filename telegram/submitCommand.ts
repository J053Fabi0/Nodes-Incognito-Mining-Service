import {
  Command,
  Commands,
  saveToRedis,
  CommandOptions,
  CommandResponse,
  addSaveToRedisProxy,
  getCommandsFromReds,
} from "./submitCommandUtils.ts";
import isError from "../types/guards/isError.ts";
import handleInfo from "./handlers/handleInfo.ts";
import handleError from "../utils/handleError.ts";
import helpMessage from "../utils/helpMessage.ts";
import EventedArray from "../utils/EventedArray.ts";
import handleIgnore from "./handlers/handleIgnore.ts";
import handleDocker from "./handlers/handleDocker.ts";
import handleDelete from "./handlers/handleDelete.ts";
import { lastErrorTimes } from "../utils/variables.ts";
import handleCopyOrMove from "./handlers/handleCopyOrMove.ts";
import handleErrorsInfo from "./handlers/handleErrorsInfo.ts";
import handleTextMessage from "./handlers/handleTextMessage.ts";
import sendMessage, { sendHTMLMessage } from "./sendMessage.ts";
import { getTextInstructionsToMoveOrDelete } from "../utils/getInstructionsToMoveOrDelete.ts";
import getCommandOrPossibilities, { AllowedCommands } from "../utils/getCommandOrPossibilities.ts";

export const commands: Commands = (() => {
  let working = false;
  setTimeout(getCommandsFromReds, 100);
  return {
    resolved: new EventedArray<string>(({ array }) => {
      saveToRedis();
      if (array.lengthNoEvent > 100) array.spliceNoEvent(0, array.lengthNoEvent - 100);
    }),
    pending: new EventedArray<Command>(async ({ array: pending }) => {
      saveToRedis();
      if (!working) {
        working = true;
        // Resolve the pending commands.
        try {
          while (pending.lengthNoEvent > 0) {
            // get the first command
            const command = pending[0];
            if (!command) continue;
            // execute the command
            const successful = await handleCommands(command.command, command.options);
            // remove it
            pending.shiftNoEvent();
            saveToRedis();
            // resolve the promise
            command.resolve?.(successful);
          }
        } catch (e) {
          handleError(e);
        }
        working = false;
      }
    }),
  };
})();

/**
 * @returns true if the command was handled successfully
 */
async function handleCommands(fullCommand: string, options?: CommandOptions): Promise<CommandResponse> {
  try {
    const repeating = fullCommand.startsWith("repeat");
    if (repeating && commands.resolved.lengths === 0) {
      await sendMessage("No previous messages to repeat.", undefined, { disable_notification: options?.silent });
      return { successful: false, error: "No previous messages to repeat." };
    }

    const [command, ...args] = fullCommand.split(" ") as [Exclude<AllowedCommands, "repeat">, ...string[]];

    switch (command) {
      case "help":
        await sendHTMLMessage(helpMessage, undefined, { disable_notification: options?.silent });
        return { successful: true, response: helpMessage };

      case "docker":
        return handleDocker(args, options);

      case "ignore":
        return handleIgnore(args, options);

      case "info":
        return handleInfo(args, options);

      case "copy":
        return handleCopyOrMove(args, "copy", options);

      case "move":
        return handleCopyOrMove(args, "move", options);

      case "delete":
        return handleDelete(args, options);

      case "errors":
        return handleErrorsInfo(args, options);

      case "instructions": {
        const response = await getTextInstructionsToMoveOrDelete();
        await sendHTMLMessage(response, undefined, { disable_notification: options?.silent });
        return { successful: true, response };
      }

      case "reset":
        for (const key of Object.keys(lastErrorTimes)) delete lastErrorTimes[key];
        await sendMessage("Reset successful.", undefined, { disable_notification: options?.silent });
        return { successful: true, response: "Reset successful." };

      case "full":
      case "text":
      case "fulltext":
      default:
        return handleTextMessage(command, options);
    }
  } catch (e) {
    handleError(e);
    if (isError(e)) return { successful: false, error: e.message };
    return { successful: false, error: "Unknown error." };
  }
}

/** Pushes a command to the queue and waits for it to be executed. */
export default async function submitCommand(
  command: string,
  options?: CommandOptions
): Promise<CommandResponse[]> {
  const fullCommands = command
    .toLowerCase()
    .split("\n")
    .filter((x) => x.trim());

  const promises: Promise<CommandResponse>[] = [];

  for (const fullCommand of fullCommands) {
    const [commandText, ...args] = fullCommand.split(" ").filter((x) => x.trim());
    const commandOrPossibilities = getCommandOrPossibilities(commandText);

    // if command was ambiguous
    if (commandOrPossibilities.possibleCommands) {
      const response =
        commandOrPossibilities.possibleCommands.length > 1
          ? `Command <code>${fullCommand}</code> is ambiguous. Did you mean one of these?\n- <code>` +
            `${commandOrPossibilities.possibleCommands
              .map((c) => `${c} ${args.join(" ")}`)
              .join("</code>\n- <code>")}</code>`
          : `Command <code>${fullCommand}</code> not found. Type /help to see the available commands.`;

      promises.push(
        sendHTMLMessage(response, undefined, { disable_notification: options?.silent }).then(() => ({
          successful: false,
          error: response,
        }))
      );
    }
    // push the command to the queue
    else {
      const finalFullCommand = [commandOrPossibilities.command, ...args].join(" ");

      promises.push(
        new Promise<CommandResponse>((r) => {
          commands.pending.push(addSaveToRedisProxy({ resolve: r, command: finalFullCommand, options }));
        }).then((response) => {
          if (response.successful)
            // add the command to the list of resolved commands
            commands.resolved.unshift(finalFullCommand);

          return response;
        })
      );
    }
  }

  const settledResults = await Promise.allSettled(promises);
  const results: CommandResponse[] = settledResults.map((result) => {
    if (result.status === "fulfilled") return result.value;
    else return { successful: false, error: "Unknown error." };
  });

  return results;
}
