export const adminURLs = [
  //
  "/credentials",
].map((pathname) => new URLPattern({ pathname }));

export const allowedForLocalhost = [
  //
  "/credentials",
].map((pathname) => new URLPattern({ pathname }));

/**
 * @param url The full URL of the page, including the domain name and protocol
 */
export default function isAdminPage(url: string) {
  const urlObj = new URL(url);

  // localhost is allowed for development for some pages
  if (urlObj.hostname === "localhost" && allowedForLocalhost.some((pattern) => pattern.test(url))) return false;

  return adminURLs.some((pattern) => pattern.test(url));
}
