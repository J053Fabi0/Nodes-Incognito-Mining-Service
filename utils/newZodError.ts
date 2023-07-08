import { ZodIssue, z, validateJSON } from "fresh-validation";

export default async function newZodError(name: string, message: string): Promise<ZodIssue> {
  const e = await validateJSON({ [name]: "aa" }, { [name]: z.string().max(1, message) });
  return e.errors![0];
}
