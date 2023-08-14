import { df } from "duplicatedFilesCleanerIncognito";
import { duplicatedConstants } from "../duplicatedFilesCleaner.ts";

/**
 * @returns The percentage of disk usage or null if the file system is not defined
 */
const getDiskUsage = async () =>
  duplicatedConstants.fileSystem
    ? +((await df(["-h", duplicatedConstants.fileSystem, "--output=pcent"])).match(/\d+(?=%)/)?.[0] ?? 0)
    : null;

export default getDiskUsage;
