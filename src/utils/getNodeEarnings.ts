import axiod from "axiod";

interface NodeEarningIncomplete {
  epoch: number;
  chainID: number;
  totalVote: number;
  totalPropose: number;
  totalVoteConfirm: number;
  totalEpochCountBlock: number;
}

interface NodeEarningNull extends NodeEarningIncomplete {
  time: null;
  reward: null;
}

interface NodeEarningString extends NodeEarningIncomplete {
  time: string;
  reward: number;
}

export type NodeEarning = NodeEarningString | NodeEarningNull;

export default async function getNodeEarnings(validatorPublicKey: string): Promise<NodeEarning[]> {
  return (await getRawData(validatorPublicKey)).map((d) => {
    const incomplete: NodeEarningIncomplete = {
      epoch: d.Epoch,
      chainID: d.ChainID,
      totalVote: d.TotalVote,
      totalPropose: d.TotalPropose,
      totalVoteConfirm: d.totalVoteConfirm,
      totalEpochCountBlock: d.totalEpochCountBlock,
    };

    if ("Time" in d && "Reward" in d)
      return { ...incomplete, time: d.Time, reward: d.Reward } as NodeEarningString;

    return { ...incomplete, time: null, reward: null } as NodeEarningNull;
  });
}

interface NodeEarningRawIncomplete {
  Epoch: number;
  ChainID: number;
  TotalVote: number;
  TotalPropose: number;
  totalVoteConfirm: number;
  totalEpochCountBlock: number;
}

interface NodeEarningRawComplete extends NodeEarningRawIncomplete {
  Time: string;
  Reward: number;
}

export type NodeEarningRaw = NodeEarningRawComplete | NodeEarningRawIncomplete;

let lastRequestTime = 0;
const minRequestInterval = 5_000; // 5 seconds
let lastRequest: NodeEarningRaw[] | undefined = undefined;

async function getRawData(validatorPublicKey: string) {
  if (lastRequest && Date.now() - lastRequestTime < minRequestInterval) return lastRequest;

  const { data } = await axiod.post<NodeEarningRaw[]>("https://monitor.incognito.org/pubkeystat/committee", {
    mpk: validatorPublicKey,
  });

  lastRequestTime = Date.now();
  lastRequest = data;
  return data;
}
