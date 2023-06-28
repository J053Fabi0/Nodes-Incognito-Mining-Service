import { FiClock } from "react-icons/fi";
import { TbReload } from "react-icons/tb";
import Typography from "../Typography.tsx";
import { BsFillPlayFill } from "react-icons/bs";
import Button, { getButtonClasses } from "../Button.tsx";
import { CommandResponse, commands } from "../../telegram/submitCommand.ts";

interface MonitorCommandsProps {
  route: string;
  commandResponse?: CommandResponse;
}

export default function MonitorCommands({ route, commandResponse }: MonitorCommandsProps) {
  return (
    <>
      <form method="post">
        {commands.resolved
          .toReversed()
          .slice(0, 5)
          .toReversed()
          .map((m) => (
            <div class="flex gap-3 mt-1 mb-5">
              <Typography variant="lead">
                <code>{m}</code>
              </Typography>

              <Button type="submit" class="py-0 px-2" name="command" value={m}>
                <BsFillPlayFill size={20} />
              </Button>
            </div>
          ))}
        {commands.pending.map((c) => (
          <div class="mt-1 mb-5">
            <Typography variant="lead" class="flex gap-3 items-center">
              <code>{c.command}</code>
              <FiClock size={20} />
            </Typography>
          </div>
        ))}
      </form>
      <form method="post">
        <div class="flex w-full mb-2 items-center gap-2">
          <input
            type="text"
            name="command"
            placeholder="Command"
            class="p-2 border border-gray-300 rounded w-full"
          />
          <a href={route} class={getButtonClasses("blue") + " h-min"} title="Reload page without resending form">
            <TbReload size={20} />
          </a>
        </div>
      </form>
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
