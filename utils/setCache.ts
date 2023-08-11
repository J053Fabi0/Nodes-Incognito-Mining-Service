import { DockerInfo } from "duplicatedFilesCleanerIncognito";
import { MonitorInfo, monitorInfoByDockerIndex } from "./variables.ts";

type DI = number | string;
type R = MonitorInfo | undefined;
type Values = DockerInfo["running"];
type Keys = "docker.running";

export default function setCache(dockerIndex: DI, key: "docker.running", value: DockerInfo["running"]): R;
export default function setCache(dockerIndex: DI, key: Keys, value: Values): R {
  const nodeCache = monitorInfoByDockerIndex[dockerIndex];
  if (nodeCache) {
    switch (key) {
      case "docker.running":
        nodeCache.nodeInfo.docker.running = value as DockerInfo["running"];
        if (value) nodeCache.nodeInfo.docker.startedAt = new Date();
        else nodeCache.nodeInfo.docker.finishedAt = new Date();
        break;
    }
    return nodeCache;
  }
}
