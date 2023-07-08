import { IS_PRODUCTION } from "../env.ts";

export const adminURLs = [
  //
  "/credentials",
  "/admin",
  "/admin/*",
  "/diffuse",
  "/api/variables/*",
].map((pathname) => new URLPattern({ pathname }));

export const allowedForDevelopment = [
  //
  "/credentials",
].map((pathname) => new URLPattern({ pathname }));

/**
 * @param url The full URL of the page, including the domain name and protocol
 */
export default function isAdminPage(url: string) {
  // some pages are allowed for development when not logged in
  if (IS_PRODUCTION === false && allowedForDevelopment.some((pattern) => pattern.test(url))) return false;

  return adminURLs.some((pattern) => pattern.test(url));
}
