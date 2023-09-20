import { ErrorTypes, errorTypes } from "../../utils/variables.ts";

export default function isErrorType(errorType: string): errorType is ErrorTypes {
  return errorTypes.includes(errorType as ErrorTypes);
}
