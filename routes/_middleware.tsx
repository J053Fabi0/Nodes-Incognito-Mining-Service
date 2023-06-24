import { ObjectId } from "mongo";
import State from "../types/state.type.ts";
import redirect from "../utils/redirect.ts";
import { cookieSession } from "fresh-session/mod.ts";
import { isAdminPage } from "../utils/isAdminPage.tsx";
import { Middleware } from "$fresh/src/server/types.ts";
import { getClient } from "../controllers/client.controller.ts";

const session = cookieSession({
  secure: true,
  httpOnly: true,
  sameSite: "Strict",
  maxAge: Number.MAX_SAFE_INTEGER,
});

export const { handler }: Middleware<State> = {
  handler: [
    // implement fresh-session
    (req, ctx) => session(req, ctx),

    // parse the session data
    (_, ctx) => {
      ctx.state.userId = ctx.state.session.get("userId");
      return ctx.next();
    },

    // fetch de user data
    async (_, ctx) => {
      ctx.state.user = null;

      if (!ctx.state.userId) return ctx.next();

      const user = await getClient({ _id: new ObjectId(ctx.state.userId) });

      if (!user) {
        ctx.state.session.set("userId", null);
      } else {
        ctx.state.user = user;
        ctx.state.isAdmin = user.role === "admin";
      }

      return ctx.next();
    },

    // check if the user is trying to access an admin page
    async (req, ctx) => {
      const url = new URL(req.url);
      if (url.pathname === "") return await ctx.next();

      if (!ctx.state.isAdmin) {
        if (url.pathname === "/signin") return ctx.next();

        // redirect to signin page if the user is trying to access an admin page
        if (isAdminPage(req.url)) return redirect("/signin");

        return ctx.next();
      }

      return ctx.next();
    },

    // add the Link: rel="modulepreload" header
    async (_, ctx) => {
      const response = await ctx.next();
      response.headers.append("Link", 'rel="modulepreload"');
      return response;
    },
  ],
};
