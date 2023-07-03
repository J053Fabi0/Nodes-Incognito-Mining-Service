export function isLastAccess(data: unknown): data is LastAccess {
  return (
    typeof data === "object" &&
    data !== null &&
    "date" in data &&
    typeof data.date === "number" &&
    "user" in data &&
    typeof data.user === "object" &&
    data.user !== null &&
    "account" in data.user &&
    typeof data.user.account === "string"
  );
}

export default interface LastAccess {
  date: number;
  user: {
    account: string;
  };
}
