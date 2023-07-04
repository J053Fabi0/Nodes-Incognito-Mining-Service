import { ObjectId } from "mongo/mod.ts";
import { join } from "std/path/mod.ts";
import { WEBSITE_URL } from "../../env.ts";
import { systemctl } from "../../utils/commands.ts";
import getNodeName from "../../utils/getNodeName.ts";

const { hostname } = new URL(WEBSITE_URL);
export const sitesEnabled = "/etc/nginx/sites-enabled/";
export const sitesAvailable = "/etc/nginx/sites-available/";

export interface CreateNginxConfigResponse {
  /** Subdomain name */
  name: string;
  url: `http://${string}`;
}

/**
 * @param number The node number of the owner, not docker index
 * @param port The port of the docker
 */
export default async function createNginxConfig(
  clientId: string | ObjectId,
  number: number,
  port: number
): Promise<CreateNginxConfigResponse> {
  const subdomain = getNodeName(clientId, number);
  const url = `${subdomain}.${hostname}`;

  const config = `server {
    server_name ${url};

    location / {
        proxy_set_header Host $host;
        proxy_pass http://127.0.0.1:${port};
        proxy_redirect off;
    }

    server_tokens off;
    server_name_in_redirect off;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}`;

  const filePath = join(sitesAvailable, subdomain);

  await Deno.writeTextFile(filePath, config);
  await Deno.symlink(filePath, join(sitesEnabled, subdomain));

  await systemctl(["reload", "nginx"]);

  return { name: subdomain, url: `http://${url}` };
}
