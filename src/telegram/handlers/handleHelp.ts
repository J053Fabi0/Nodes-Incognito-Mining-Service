import { sendHTMLMessage } from "../sendMessage.ts";

export default function handleHelp() {
  return sendHTMLMessage(
    "<b>Available commands</b>\n\n" +
      [
        ["ignore [code=docker] [minutes=0]", "Ignore an error code for an amount of minutes"],
        ["ignore codes", "List the error codes"],
        ["reset|restart", "Reset the timings of the errors"],
        ["(info|status) [...nodeIndexes=all]", "Get the docker status, files of shards and system info"],
        ["(info|status) fs", "Get system info"],
        ["docker [start|stop] [...nodeIndexes|all]", "Start or stop the docker containers"],
        ["copy [fromNodeIndex] [toNodeIndex] [...shards=beacon]", "Copy files from one node to another"],
        ["move [fromNodeIndex] [toNodeIndex] [...shards=beacon]", "Move files from one node to another"],
      ]
        .map(([command, description]) => `- ${description}.\n<code>${command}</code>`)
        .join("\n\n")
  );
}
