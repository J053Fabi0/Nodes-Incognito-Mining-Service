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

interface Command {
  command: string;
  resolve: (response: CommandResponse) => void;
}
export const commands: {
  /** The first one is the oldest */
  resolved: EventedArray<string>;
  /** The first one is the oldest */
  pending: EventedArray<Command>;
} = (() => {
  let working = false;
  return {
    resolved: new EventedArray<string>(({ array }) => {
      if (array.lengthNoEvent > 100) array.spliceNoEvent(0, array.lengthNoEvent - 100);
    }),
    pending: new EventedArray<Command>(async ({ array: pending }) => {
      if (!working) {
        working = true;
        // Resolve the pending commands.
        while (pending.lengthNoEvent > 0) {
          // get the first command
          const command = pending[0];
          if (!command) continue;
          // execute the command
          const successful = await handleCommands(command.command);
          // remove it
          pending.shiftNoEvent();
          // resolve the promise
          command.resolve(successful);
        }
        working = false;
      }
    }),
  };
})();

export type CommandResponse = { response: string; successful: true } | { successful: false; error: string };
/**
 * @returns true if the command was handled successfully
 */
async function handleCommands(fullCommand: string): Promise<CommandResponse> {
  try {
    const repeating = fullCommand.startsWith("repeat");
    if (repeating && commands.resolved.lengths === 0) {
      await sendMessage("No previous messages to repeat.");
      return { successful: false, error: "No previous messages to repeat." };
    }

    const [command, ...args] = fullCommand.split(" ") as [Exclude<AllowedCommands, "repeat">, ...string[]];

    switch (command) {
      case "help":
        await sendHTMLMessage(helpMessage);
        return { successful: true, response: helpMessage };

      case "docker":
        return handleDocker(args);

      case "ignore":
        return handleIgnore(args);

      case "info":
        return handleInfo(args);

      case "copy":
        return handleCopyOrMove(args, "copy");

      case "move":
        return handleCopyOrMove(args, "move");

      case "delete":
        return handleDelete(args);

      case "errors":
        return handleErrorsInfo(args);

      case "instructions": {
        const response = await getTextInstructionsToMoveOrDelete();
        await sendHTMLMessage(response);
        return { successful: true, response };
      }

      case "reset":
        for (const key of Object.keys(lastErrorTimes)) delete lastErrorTimes[key];
        await sendMessage("Reset successful.");
        return { successful: true, response: "Reset successful." };

      case "full":
      case "text":
      case "fulltext":
      default:
        return handleTextMessage(command);
    }
  } catch (e) {
    handleError(e);
    if (isError(e)) return { successful: false, error: e.message };
    return { successful: false, error: "Unknown error." };
  }
}

/** Pushes a command to the queue and waits for it to be executed. */
export default async function submitCommand(command: string): Promise<CommandResponse[]> {
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

      promises.push(sendHTMLMessage(response).then(() => ({ successful: false, error: response })));
    }
    // push the command to the queue
    else {
      const finalFullCommand = [commandOrPossibilities.command, ...args].join(" ");

      promises.push(
        new Promise<CommandResponse>((resolve) => {
          commands.pending.push({ resolve, command: finalFullCommand });
        }).then((response) => {
          if (response.successful)
            // add the command to the list of resolved commands
            commands.resolved.push(finalFullCommand);

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
