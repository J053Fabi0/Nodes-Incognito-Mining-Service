import State from "../types/state.type.ts";
import redirect from "../utils/redirect.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import Client from "../types/collections/client.type.ts";
import { getClients } from "../controllers/client.controller.ts";
import { getTypographyClass } from "../components/Typography.tsx";

interface CredentialProps {
  clients: Client[];
}

export const handler: Handlers<CredentialProps, State> = {
  async GET(_, ctx) {
    const clients = (await getClients({}, { projection: { role: 1, name: 1, telegram: 1 } }))
      .sort((a, b) => a.role.localeCompare(b.role))
      .filter((c) => `${c._id}` !== `${ctx.state.userId}`);

    return ctx.render({ clients });
  },

  async POST(req, ctx) {
    const form = await req.formData();
    const clientId = form.get("client")?.toString();
    if (!clientId) return new Response("Missing client id", { status: 400 });

    ctx.state.session.set("supplanting", true);
    ctx.state.session.set("userId", clientId);

    return redirect(`/`);
  },
};

export default function Credentials({ data }: PageProps<CredentialProps>) {
  const { clients } = data;

  return (
    <>
      <form method="POST">
        <ul class="list-disc list-inside mt-5">
          {clients.map((client) => (
            <li class={`mb-1 ${getTypographyClass("lead")}`}>
              <button type="submit" name="client" value={`${client._id}`} class="hover:underline">
                {client.role === "admin" ? "👑 " : ""}
                {`${client.name} - ${client.telegram}`}
              </button>
            </li>
          ))}
        </ul>
      </form>
    </>
  );
}
