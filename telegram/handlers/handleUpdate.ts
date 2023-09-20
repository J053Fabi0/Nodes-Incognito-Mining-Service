import sendMessage from "../sendMessage.ts";
import isError from "../../types/guards/isError.ts";
import updateDockers from "../../crons/updateDockers.ts";
import validateItems from "../../utils/validateItems.ts";
import { CommandOptions, CommandResponse } from "../submitCommandUtils.ts";

export default async function handleUpdate(
  rawNodes: string[],
  options?: CommandOptions
): Promise<CommandResponse> {
  const nodes = await validateItems({ rawItems: rawNodes }).catch((e) => {
    if (isError(e)) return e;
    throw e;
  });
  if (isError(nodes)) return { successful: false, error: nodes.message };

  if (options?.telegramMessages)
    await sendMessage("Updating...", undefined, { disable_notification: options?.silent });

  await updateDockers({ force: true, dockerIndexes: nodes.map((node) => +node) });

  if (options?.telegramMessages)
    await sendMessage("Update successful.", undefined, { disable_notification: options?.silent });

  return { successful: true, response: "" };
}
