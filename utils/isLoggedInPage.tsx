export const loggedInURLs = [
  //
  "/nodes",
  "/nodes/*",
  "/api/*",
  "/me",
  "/me/*",
  "/bot-is-blocked",
].map((pathname) => new URLPattern({ pathname }));

/**
 * @param url The full URL of the page, including the domain name and protocol
 */
export default function isLoggedInPage(url: string) {
  return loggedInURLs.some((pattern) => pattern.test(url));
}
