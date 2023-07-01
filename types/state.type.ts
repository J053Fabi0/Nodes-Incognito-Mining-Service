import Client from "./collections/client.type.ts";
import { CommandResponse } from "../telegram/submitCommand.ts";
import { WithSession } from "fresh-session/src/stores/interface.ts";

/**
 * State of the application
 */
export default interface State extends WithSession {
  user: Client | null;
  isAdmin: boolean;

  // saved in cookies
  userId?: string | null;
  supplanting: boolean; // if true, an admin is supplanting a user
  commandResponse?: CommandResponse | null;
  prvPrice?: {
    usd: number;
    expires: number; // timestamp
    /** The prv it needs to give to host a new node. Decimal format */
    prvToPay: number;
  };
}
