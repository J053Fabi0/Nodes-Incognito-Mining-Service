import axiod from "axiod";
import constants from "../../constants.ts";

const mpk = constants.map((c) => c.publicValidatorKey).join(",");

export default async function getNodesStatus() {
  const { data } = await axiod.post<
    {
      Alert: boolean;
      Role: "PENDING";
      IsSlashed: boolean;
      MiningPubkey: string;
      IsOldVersion: boolean;
      Status: "ONLINE" | "OFFLINE";
    }[]
  >("https://monitor.incognito.org/pubkeystat/stat", { mpk });

  return data.map((d) => ({
    role: d.Role,
    alert: d.Alert,
    status: d.Status,
    isSlashed: d.IsSlashed,
    isOldVersion: d.IsOldVersion,
    ...constants.find((c) => c.publicValidatorKey === d.MiningPubkey)!,
  }));
}
