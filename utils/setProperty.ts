export type RecursiveObject = {
  [key: string]: RecursiveObject | string | number | boolean;
};

export default function setProperty(path: string[], value: string, obj: RecursiveObject) {
  const [first, ...rest] = path;
  if (!(first in obj)) throw new Error(`Property not found in path ${path.join(".")}`);

  if (rest.length > 0) {
    const newObj = obj[first];
    if (typeof newObj === "object") return setProperty(rest, value, newObj);
    throw new Error(`Property ${first} is not an object`);
  }

  const typeofValue = typeof obj[first];

  if (typeofValue === "number") obj[first] = Number(value);
  else if (typeofValue === "boolean") obj[first] = value === "true";
  else obj[first] = value;
}
