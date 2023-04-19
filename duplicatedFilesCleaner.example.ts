import DuplicatedFilesCleaner, { Constants } from "duplicatedFilesCleanerIncognito";

export const duplicatedConstants: Constants = {
  homePath: "/home/incognito",
  storageFolder: "storage",
  fileSystem: "/dev/sda3", // for the server
  // fileSystem: "/dev/nvme0n1p2", // for the laptop

  // When a node is active it creates and removes many files all the time, but only the newer ones.
  // These are the number of newer files that will be ignored when creating the hard links.
  // A lower number will save more storage, but you risk corrupting the data as you may remove a file
  // that is still being modified by the node.
  // This parameter is only used for online nodes. If it's negative, it will ignore them.
  filesToStripIfOnline: -1,
  filesToStripIfOffline: 20_000,

  // The minimum number of files that a shard must have to be considered present, for example when
  // getting the info of a node. If a shard has less files than this, it will be considered empty.
  minFilesToConsiderShard: 200,

  instructions: [
    {
      shardName: "beacon",
      nodes: [0, 1, 2, 3, 4, 5, 6],
    },
    {
      shardName: "shard2",
      nodes: [2, 4],
    },
    {
      shardName: "shard5",
      nodes: [5, 6],
    },
    {
      shardName: "shard7",
      nodes: [1, 3],
    },
  ],
};

const duplicatedFilesCleaner = new DuplicatedFilesCleaner(duplicatedConstants);
export default duplicatedFilesCleaner;
