import dayjs from "dayjs/mod.ts";
import utc from "dayjs/plugin/utc.ts";
import { lastRoles } from "./variables.ts";
import checkNotStakedNodes from "../crons/checkNotStakedNodes.ts";

dayjs.extend(utc);

lastRoles["11"].date = dayjs().subtract(4, "day").valueOf();

await checkNotStakedNodes();
