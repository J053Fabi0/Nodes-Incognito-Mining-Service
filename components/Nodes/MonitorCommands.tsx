import { FiClock } from "react-icons/fi";
import { TbReload } from "react-icons/tb";
import Typography from "../Typography.tsx";
import { BsFillPlayFill } from "react-icons/bs";
import { MdScheduleSend } from "react-icons/md";
import Button, { getButtonClasses } from "../Button.tsx";
import { commands } from "../../telegram/submitCommand.ts";
import { CommandResponse } from "../../telegram/submitCommandUtils.ts";

interface MonitorCommandsProps {
  route: string;
  commandResponse?: CommandResponse | null;
}

export default function MonitorCommands({ route, commandResponse }: MonitorCommandsProps) {
  return (
    <>
      {/* The command history */}
      <form method="post">
        {commands.resolved
          .slice(0, 5)
          .toReversed()
          .map((m) => (
            <div class="flex gap-3 mt-1 mb-3">
              <Typography variant="lead">
                <code>{m}</code>
              </Typography>

              <Button type="submit" class="py-0 px-2" name="command" value={m}>
                <BsFillPlayFill size={20} />
              </Button>
            </div>
          ))}
        {commands.pending.toReversed().map((c) => (
          <div class="mt-1 mb-3">
            <Typography variant="lead" class="flex gap-3 items-center">
              <code>{c.command}</code>
              <FiClock size={20} />
            </Typography>
          </div>
        ))}
      </form>

      {/* The command input */}
      <form method="post" class="sticky top-0 left-0 right-0 bg-white mb-2 pt-2">
        <div class="flex w-full items-center gap-2 drop-shadow-md bg-white rounded-lg">
          <input
            required
            type="text"
            name="command"
            placeholder="Command"
            class="p-2 border border-gray-300 rounded w-full"
          />

          {/* This hidden button is necessary to submit the form without sending "noWait", but instead sending "submit" */}
          <button name="submit" value="submit" class="invisible p-0 ml-[-0.5rem]" />

          <Button name="submit" value="noWait" color="red" title="Send without waiting for result">
            <MdScheduleSend size={20} />
          </Button>

          <a href={route} class={getButtonClasses("blue") + " h-min"} title="Reload page without resending form">
            <TbReload size={20} />
          </a>
        </div>
      </form>

      {/* The command response */}
      {commandResponse && (
        <>
          <Typography variant="lead">
            <div
              dangerouslySetInnerHTML={{
                __html: (commandResponse.successful ? commandResponse.response : commandResponse.error)
                  // replace all newlines with <br />
                  .replace(/\n/g, "<br />"),
              }}
            />
          </Typography>
          <div class="mb-2" />
        </>
      )}
    </>
  );
}
