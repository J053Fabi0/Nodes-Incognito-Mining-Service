export const adminURLs = [
  //
  "/credentials",
].map((pathname) => new URLPattern({ pathname }));

/**
 * @param url The full URL of the page, including the domain name and protocol
 */
export default function isAdminPage(url: string) {
  return adminURLs.some((pattern) => pattern.test(url));
}
