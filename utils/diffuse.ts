import dayjs from "dayjs/mod.ts";
import utc from "dayjs/plugin/utc.ts";
import { lastRoles } from "./variables.ts";

dayjs.extend(utc);

lastRoles["11"].date = dayjs().subtract(2, "day").valueOf();
