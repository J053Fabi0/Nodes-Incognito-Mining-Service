import { join, fromFileUrl } from "std/path/mod.ts";

export const freshOrStaticURLs = ["/_frsh/*"].map((pathname) => new URLPattern({ pathname }));

// Add all static files to the list of freshOrStaticURLs
for (const file of [...Deno.readDirSync(join(fromFileUrl(import.meta.url), "../../static"))])
  if (file.isDirectory) freshOrStaticURLs.push(new URLPattern({ pathname: `/${file.name}/*` }));
  else freshOrStaticURLs.push(new URLPattern({ pathname: `/${file.name}` }));

/**
 * @param url The full URL of the page, including the domain name and protocol
 */
export default function isFreshOrStaticPage(url: string) {
  return freshOrStaticURLs.some((pattern) => pattern.test(url));
}
