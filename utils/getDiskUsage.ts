import { fileSystem } from "../constants.ts";
import { df } from "../duplicatedFilesCleaner/utils/commands.ts";

/**
 * @returns The percentage of disk usage or null if the file system is not defined
 */
const getDiskUsage = async () => +((await df(["-h", fileSystem, "--output=pcent"])).match(/\d+(?=%)/)?.[0] ?? 0);

export default getDiskUsage;
