import getCommandOrPossibilities, {
  AllowedCommands,
  AllowedCommandsWithOptions,
} from "../utils/getCommandOrPossibilities.ts";
import { BUILDING } from "../env.ts";
import isError from "../types/guards/isError.ts";
import handleInfo from "./handlers/handleInfo.ts";
import handleError from "../utils/handleError.ts";
import helpMessage from "../utils/helpMessage.ts";
import EventedArray from "../utils/EventedArray.ts";
import handleIgnore from "./handlers/handleIgnore.ts";
import handleDocker from "./handlers/handleDocker.ts";
import handleDelete from "./handlers/handleDelete.ts";
import handleUpdate from "./handlers/handleUpdate.ts";
import { lastErrorTimes } from "../utils/variables.ts";
import handleDiffuse from "./handlers/handleDiffuse.ts";
import handleCopyOrMove from "./handlers/handleCopyOrMove.ts";
import handleErrorsInfo from "./handlers/handleErrorsInfo.ts";
import handleTextMessage from "./handlers/handleTextMessage.ts";
import sendMessage, { sendHTMLMessage } from "./sendMessage.ts";
import handleNodeCommand from "./handlers/handleNodeCommand.ts";
import { getTextInstructionsToMoveOrDelete } from "../utils/getInstructionsToMoveOrDelete.ts";
import { Command, Commands, CommandOptions, CommandResponse, getCommandsFromRedis } from "./submitCommandUtils.ts";

export const commands: Commands = (() => {
  let working = false;
  if (!BUILDING) setTimeout(getCommandsFromRedis, 100);

  return {
    resolved: new EventedArray<AllowedCommandsWithOptions>(({ array }) => {
      if (array.lengthNoEvent > 100) array.spliceNoEvent(100, Infinity);
    }),
    pending: new EventedArray<Command>(async ({ array: pending, added }) => {
      if (added && added.some((a) => a.options?.rightAway)) {
        const rightAwayCommands = pending.filter((a) => a.options?.rightAway);
        // delete them from the pending array
        for (const command of rightAwayCommands) pending.spliceNoEvent(pending.indexOf(command), 1);
        // resolve them all at once
        for (const command of rightAwayCommands) {
          handleCommands(command)
            .then((successful) => command.resolve?.(successful))
            .catch((e) => {
              if (isError(e)) command.resolve?.({ successful: false, error: e.message });
              else command.resolve?.({ successful: false, error: "Unknown error." });
            })
            // add the command to the list of resolved commands
            .finally(() => commands.resolved.unshift(command.command));
        }
      }

      if (!working) {
        working = true;
        // Resolve the pending commands.
        try {
          while (pending.lengthNoEvent > 0) {
            // get the first command
            const command = pending[0];
            if (!command) continue;

            // execute the command
            const promise = handleCommands(command).catch((e) => {
              if (isError(e)) return { successful: false, error: e.message } satisfies CommandResponse;
              else return { successful: false, error: "Unknown error." } satisfies CommandResponse;
            });

            const successful = command.options?.detached
              ? // don't await for the command if it's detached
                ({ successful: true, response: "Command submitted detached." } satisfies CommandResponse)
              : await promise;

            // remove it
            pending.shiftNoEvent();
            // resolve the promise
            command.resolve?.(successful);
            // add the command to the list of resolved commands
            commands.resolved.unshift(command.command);
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
// async function handleCommands(fullCommand: string, options?: CommandOptions): Promise<CommandResponse> {
async function handleCommands(commandObj: Command): Promise<CommandResponse> {
  try {
    const options = commandObj.options;

    if (commandObj.command.startsWith("repeat")) {
      if (commands.resolved.lengths === 0) {
        if (options?.telegramMessages)
          await sendMessage("No previous messages to repeat.", undefined, {
            disable_notification: options?.silent,
          });
        return { successful: false, error: "No previous messages to repeat." };
      } else commandObj.command = commands.resolved[0];
    }

    const [command, ...args] = commandObj.command.split(" ") as [Exclude<AllowedCommands, "repeat">, ...string[]];

    switch (command) {
      case "help":
        if (options?.telegramMessages)
          await sendHTMLMessage(helpMessage, undefined, { disable_notification: options?.silent });
        return { successful: true, response: helpMessage };

      case "docker":
        return await handleDocker(args, options);

      case "ignore":
        return await handleIgnore(args, options);

      case "info":
        return await handleInfo(args, options);

      case "copy":
        return await handleCopyOrMove(args, "copy", options);

      case "move":
        return await handleCopyOrMove(args, "move", options);

      case "delete":
        return await handleDelete(args, options);

      case "errors":
        return await handleErrorsInfo(args, options);

      case "instructions": {
        const response = await getTextInstructionsToMoveOrDelete();
        if (options?.telegramMessages)
          await sendHTMLMessage(response, undefined, { disable_notification: options?.silent });
        return { successful: true, response };
      }

      case "reset":
        for (const dockerIndex of Object.keys(lastErrorTimes)) delete lastErrorTimes[dockerIndex];
        if (options?.telegramMessages)
          await sendMessage("Reset successful.", undefined, { disable_notification: options?.silent });
        return { successful: true, response: "Reset successful." };

      case "update":
        return await handleUpdate(args, options);

      case "diffuse":
        return await handleDiffuse(args, options);

      case "node":
        return await handleNodeCommand(args, options);

      case "full":
      case "text":
      case "fulltext":
      default:
        return await handleTextMessage(command, options);
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
  options: CommandOptions = {}
): Promise<CommandResponse[]> {
  const fullCommands = command
    .toLowerCase()
    .split(/\n|;/)
    .map((x) => x.trim())
    .filter(Boolean);

  const promises: Promise<CommandResponse>[] = [];

  for (const fullCommand of fullCommands) {
    const commandArray = fullCommand.split(" ").filter(Boolean);

    const lastArgument = () => commandArray[commandArray.length - 1];
    if (/(&|!|&!|!&)$/.test(lastArgument())) {
      if (lastArgument().includes("!")) {
        options.rightAway = true;
        options.detached = true; // if it's right away, it's detached
      } else if (lastArgument().includes("&")) options.detached = true;

      while (lastArgument().endsWith("&") || lastArgument().endsWith("!"))
        commandArray[commandArray.length - 1] = lastArgument().slice(0, -1); // remove the & or !
      if (!lastArgument()) commandArray.pop(); // remove the last argument if it's empty
    }

    const [commandText, ...args] = commandArray;
    if (!commandText) continue;
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
      const commandResponse: CommandResponse = { successful: false, error: response };

      promises.push(
        options?.telegramMessages
          ? sendHTMLMessage(response, undefined, { disable_notification: options?.silent }).then(
              () => commandResponse
            )
          : Promise.resolve(commandResponse)
      );
    }
    // push the command to the queue
    else {
      const finalFullCommand = [commandOrPossibilities.command, ...args].join(" ") as AllowedCommandsWithOptions;

      promises.push(
        new Promise<CommandResponse>((r) => {
          commands.pending.push({ resolve: r, command: finalFullCommand, options });
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
