export const adminURLs = [].map((pathname) => new URLPattern({ pathname }));

/**
 * @param url The full URL of the page, including the domain name and protocol
 */
export function isAdminPage(url: string) {
  return adminURLs.some((pattern) => pattern.test(url));
}
