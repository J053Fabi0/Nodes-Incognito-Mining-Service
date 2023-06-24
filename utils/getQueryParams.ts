/**
 * Returns an object with the query params of the url.
 * @param url It must be a full url.
 */
export default function getQueryParams<T extends { [k: string]: string }>(url: string) {
  return Object.fromEntries([...new URLSearchParams(url.split("?")[1] || "").entries()]) as T;
}
