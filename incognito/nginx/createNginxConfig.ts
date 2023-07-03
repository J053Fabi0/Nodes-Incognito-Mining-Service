import { join } from "std/path/mod.ts";
import { WEBSITE_URL } from "../../env.ts";
import { systemctl } from "../../utils/commands.ts";

const { hostname } = new URL(WEBSITE_URL);
const sitesEnabled = "/etc/nginx/sites-enabled/";
const sitesAvailable = "/etc/nginx/sites-available/";

/**
 *
 * @param name The name of the owner
 * @param number The node number of the owner, not docker index
 * @param port The port of the docker
 */
export default async function createNginxConfig(name: string, number: number, port: number): Promise<void> {
  const subdomain = `${name}-${number}`;

  const config = `server {
    server_name ${subdomain}.${hostname};

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
}
