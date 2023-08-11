import { DockerInfo } from "duplicatedFilesCleanerIncognito";
import { MonitorInfo, monitorInfoByDockerIndex } from "./variables.ts";

type DI = number | string;
type R = MonitorInfo | undefined;
type Values = DockerInfo["running"];
type Keys = "docker.running";

export default function setCache(dockerIndex: DI, key: "docker.running", value: DockerInfo["running"]): R;
export default function setCache(dockerIndex: DI, key: Keys, value: Values): R {
  const nodeInfo = monitorInfoByDockerIndex[dockerIndex];
  if (nodeInfo) {
    switch (key) {
      case "docker.running":
        nodeInfo.nodeInfo.docker.running = value as DockerInfo["running"];
        break;
    }
    return nodeInfo;
  }
}
