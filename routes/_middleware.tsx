import { ObjectId } from "mongo/mod.ts";
import State from "../types/state.type.ts";
import { redis } from "../initDatabase.ts";
import redirect from "../utils/redirect.ts";
import isAdminPage from "../utils/isAdminPage.tsx";
import { redisSession } from "fresh-session/mod.ts";
import LastAccess from "../types/lastAccess.type.ts";
import { Middleware } from "$fresh/src/server/types.ts";
import isLoggedInPage from "../utils/isLoggedInPage.tsx";
import isFreshOrStaticPage from "../utils/isFreshOrStatic.ts";
import { getClient } from "../controllers/client.controller.ts";

export const { handler }: Middleware<State> = {
  handler: [
    // implement fresh-session
    redisSession(redis, {
      secure: true,
      httpOnly: true,
      sameSite: "Strict",
      maxAge: Number.MAX_SAFE_INTEGER,
    }),

    // parse the session data
    (req, ctx) => {
      if (isFreshOrStaticPage(req.url)) return ctx.next();
      ctx.state.userId = ctx.state.session.get("userId");
      ctx.state.commandResponse = ctx.state.session.get("commandResponse");
      ctx.state.supplanting = Boolean(ctx.state.session.get("supplanting"));
      return ctx.next();
    },

    // fetch de user data
    async (req, ctx) => {
      if (isFreshOrStaticPage(req.url)) return ctx.next();
      ctx.state.user = null;

      if (!ctx.state.userId) return ctx.next();

      const user = await getClient({ _id: new ObjectId(ctx.state.userId) });

      if (!user) {
        ctx.state.session.set("userId", null);
      } else {
        ctx.state.user = user;
        ctx.state.isAdmin = user.role === "admin" || Boolean(ctx.state.supplanting);

        // save the last time the user accessed the website
        redis.set(
          `last_access_${ctx.state.userId}`,
          JSON.stringify({ user: { account: `${user.account}` }, date: Date.now() } satisfies LastAccess)
        );

        const url = new URL(req.url);
        if (user.isBotBlocked && url.pathname !== "/bot-is-blocked") return redirect("/bot-is-blocked");
      }

      return ctx.next();
    },

    // check if the user is trying to access a page he's not supposed to
    async (req, ctx) => {
      if (isFreshOrStaticPage(req.url)) return ctx.next();
      const url = new URL(req.url);
      if (url.pathname === "") return await ctx.next();

      // admin pages
      if (!ctx.state.isAdmin) {
        if (url.pathname === "/signin") return ctx.next();

        // redirect to signin page if the user is trying to access an admin page
        if (isAdminPage(req.url)) return redirect("/signin");
      }

      // logged-in pages
      if (!ctx.state.user && isLoggedInPage(req.url)) return redirect("/signin");

      return ctx.next();
    },

    // add the Link: rel="modulepreload" header
    async (req, ctx) => {
      if (isFreshOrStaticPage(req.url)) return ctx.next();
      const response = await ctx.next();
      response.headers.append("Link", 'rel="modulepreload"');
      return response;
    },
  ],
};
