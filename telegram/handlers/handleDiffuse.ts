import sendMessage from "../sendMessage.ts";
import diffuse from "../../utils/diffuse.ts";
import isError from "../../types/guards/isError.ts";
import handleError from "../../utils/handleError.ts";
import { CommandOptions, CommandResponse } from "../submitCommandUtils.ts";

export default async function handleDiffuse(_: string[], options?: CommandOptions): Promise<CommandResponse> {
  if (options?.telegramMessages)
    await sendMessage("Diffusing...", undefined, { disable_notification: options?.silent });

  try {
    await diffuse();
  } catch (e) {
    if (isError(e)) return { successful: false, error: e.message };
    else {
      handleError(e);
      return { successful: false, error: "Unknown error while diffusing." };
    }
  }

  if (options?.telegramMessages)
    await sendMessage("Diffuse successful.", undefined, { disable_notification: options?.silent });

  return { successful: true, response: "" };
}
