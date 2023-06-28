export type AllowedCommands =
  | "repeat"
  | "full"
  | "fulltext"
  | "copy"
  | "move"
  | "text"
  | "reset"
  | "delete"
  | "docker"
  | "errors"
  | "ignore"
  | "info"
  | "instructions"
  | "help";
interface CommandWithAliases {
  command: AllowedCommands;
  aliases: string[];
}
const commandsWithAliases: CommandWithAliases[] = [
  { command: "repeat", aliases: ["r", "repetir"] },
  { command: "full", aliases: ["f", "completo", "todo", "all"] },
  { command: "fulltext", aliases: ["ft"] },
  { command: "copy", aliases: ["cp"] },
  { command: "move", aliases: ["mv"] },
  { command: "text", aliases: [] },
  { command: "reset", aliases: [] },
  { command: "delete", aliases: ["rm"] },
  { command: "docker", aliases: [] },
  { command: "errors", aliases: [] },
  { command: "ignore", aliases: [] },
  { command: "info", aliases: ["status"] },
  { command: "instructions", aliases: [] },
  { command: "help", aliases: [] },
];
interface PossibleCommand {
  command: CommandWithAliases["command"];
  matchedAlias: string | undefined;
}
export default function getCommandOrPossibilities(command: string) {
  const normalizedCommand = command.replace(/^\/+/, "").toLowerCase();
  const exactCommand = commandsWithAliases.find(
    (c) => c.command === normalizedCommand || c.aliases.includes(normalizedCommand)
  );

  if (exactCommand === undefined) {
    const possibleCommands: PossibleCommand[] = [
      // matching aliases
      ...commandsWithAliases
        .map((c) => {
          return c.aliases
            .filter((alias) => alias.startsWith(normalizedCommand))
            .map((alias) => ({ command: c.command, matchedAlias: alias }));
        })
        .flat(),
      // matching commands
      ...commandsWithAliases
        .filter((c) => c.command.startsWith(normalizedCommand))
        .map((c) => ({ command: c.command, matchedAlias: undefined })),
    ];

    // if only one possible command, return it
    if (possibleCommands.length === 1) return { command: possibleCommands[0].command, possibleCommands: null };

    return {
      command: null,
      /** Ambiguous commands or aliases */
      possibleCommands: possibleCommands.map((c) => c.matchedAlias ?? c.command),
    };
  }

  return { command: exactCommand.command, possibleCommands: null };
}
