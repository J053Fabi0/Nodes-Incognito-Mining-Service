import { WithSession } from "fresh-session/src/stores/interface.ts";
import Client from "./collections/client.type.ts";

export default interface State extends WithSession {
  user: Client | null;
  isAdmin: boolean;

  // saved in cookies
  userId?: string | null;
  supplanting: boolean; // if true, an admin is supplanting a user
}
