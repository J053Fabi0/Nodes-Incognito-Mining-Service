const helpMessage =
  "<b>Available commands</b>\n\n" +
  [
    ["ignore [code=docker] [minutes=0]", "Ignore an error code for an amount of minutes"],
    ["ignore codes", "List the error codes"],
    ["reset", "Reset the timings of the errors"],
    ["(info|status) [...nodeIndexes=all]", "Get the docker status, files of shards and system info"],
    ["(info|status) fs", "Get system info"],
    ["docker [start|stop] [...nodeIndexes|all]", "Start or stop the docker containers"],
    ["copy [fromNodeIndex] [toNodeIndex] [...shards=beacon]", "Copy files from one node to another"],
    ["move [fromNodeIndex] [toNodeIndex] [...shards=beacon]", "Move files from one node to another"],
    ["delete [fromNodeIndex] [...shards=beacon]", "Delete the shards of a node"],
    ["errors [...errorCode=all]", "Show the errors' statuses"],
    ["instructions", "Show the instructions to move or delete files"],
    ["update [...nodeIndexes", "Update the docker containers"],
    ["diffuse", "Run the diffuser function"],
    ["r", "Repeat the last command"],
  ]
    .map(([command, description]) => `- ${description}.\n<code>${command}</code>`)
    .join("\n\n") +
  "\n\n" +
  "<code>command!</code> - Run it right away and with no await.\n" +
  "<code>command&amp;</code> - Run it with no await.";

export default helpMessage;
