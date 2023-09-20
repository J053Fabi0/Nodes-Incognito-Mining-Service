import { GlobalErrorTypes, globalErrorTypes } from "../../utils/variables.ts";

export default function isGlobalErrorType(errorType: string): errorType is GlobalErrorTypes {
  return globalErrorTypes.includes(errorType as GlobalErrorTypes);
}
