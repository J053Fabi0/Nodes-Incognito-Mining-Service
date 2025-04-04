import { lodash as _ } from "lodash";
import { join } from "std/path/mod.ts";
import { cp } from "../utils/commands.ts";
import getFiles from "../utils/getFiles.ts";
import maxPromises from "../utils/maxPromises.ts";
import normalizeShards from "../utils/normalizeShards.ts";
import DuplicatedFilesCleaner from "./DuplicatedFilesCleaner.ts";
import ShardsNumbers, { ShardsNames, ShardsStr } from "../types/shards.type.ts";

const filesToCopyAtOnce = 50;

interface CopyDataOptions {
  to: string | number;
  from: string | number;
  shards?: (ShardsStr | ShardsNumbers | ShardsNames)[];
}

export default async function copyData(
  this: DuplicatedFilesCleaner,
  { to, from, shards = ["beacon"] }: CopyDataOptions
) {
  const normalizedShards = normalizeShards(shards);
  if (normalizedShards.length === 0) normalizedShards.push("beacon");

  for (const shard of normalizedShards) {
    console.log(`Copying ${shard}'s files from ${from} to ${to}`);

    const fromShardPath = join(this.homePath, `/node_data_${from}/mainnet/block/${shard}`);
    const toShardPath = join(this.homePath, `/node_data_${to}/mainnet/block/${shard}`);

    const allLdbFiles = getFiles(fromShardPath);

    const filesToHardLink = allLdbFiles.slice(Math.max(this.filesToCopy, 0));
    const filesToCopy = [
      // the files that are not ldb files
      ...[...Deno.readDirSync(fromShardPath)].filter((file) => !file.name.endsWith(".ldb")),
      // the files that were sliced from allLdbFiles
      ...allLdbFiles.slice(0, Math.max(this.filesToCopy, 0)),
    ];

    console.log("Emptying the destination directory");
    // If the file exists, delete it
    await Deno.remove(toShardPath, { recursive: true }).catch(() => {});
    Deno.mkdirSync(toShardPath, { recursive: true });

    console.log("Copying the ldb files with hard links");
    await Promise.all(
      filesToHardLink.map((file) => Deno.link(join(fromShardPath, file.name), join(toShardPath, file.name)))
    );

    console.log("Copying the rest of the files with copy, including directories");
    const filesWithFullPath = filesToCopy.map((f) => join(fromShardPath, f.name));
    const promises = _.chunk(filesWithFullPath, filesToCopyAtOnce).map(
      (files) => () => cp(["-r", "--preserve=all", ...files, toShardPath])
    );
    await maxPromises(promises, 20);
  }
}

/**
 * Copy a file or directory recursively
 * @param fromPath The path to copy from
 * @param toPath The path to copy to
 * @param file The file or directory to copy
 */
export async function copyFileOrDir(fromPath: string, toPath: string, file: Deno.DirEntry) {
  const fromFilePath = join(fromPath, file.name);
  const toFilePath = join(toPath, file.name);

  // If its a directory
  if (file.isDirectory) {
    // Create the directory
    Deno.mkdirSync(toFilePath, { recursive: true });

    // Copy the contents of the directory into the new directory recursively
    await Promise.all(
      [...Deno.readDirSync(fromFilePath)].map((dirFile) => copyFileOrDir(fromFilePath, toFilePath, dirFile))
    );
  }
  //
  // Else just copy the file
  else await Deno.copyFile(fromFilePath, toFilePath);
}
