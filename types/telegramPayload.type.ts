export default interface TelegramPayload {
  id: string;
  hash: string;
  auth_date: string;
  username?: string;
  last_name?: string;
  photo_url?: string;
  first_name?: string;
}

export function isTelegramPayload(arg: any): arg is TelegramPayload {
  const keys = Object.keys(arg);
  return (
    arg &&
    typeof arg.id === "string" &&
    typeof arg.hash === "string" &&
    typeof arg.auth_date === "string" &&
    (typeof arg.username === "string" || typeof arg.username === "undefined") &&
    (typeof arg.last_name === "string" || typeof arg.last_name === "undefined") &&
    (typeof arg.photo_url === "string" || typeof arg.photo_url === "undefined") &&
    (typeof arg.first_name === "string" || typeof arg.first_name === "undefined") &&
    keys.length <= 8 &&
    keys.length >= 3
  );
}
