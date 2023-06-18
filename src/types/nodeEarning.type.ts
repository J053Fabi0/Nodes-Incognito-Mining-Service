export interface NodeEarningIncomplete {
  Epoch: number;
  ChainID: number;
  TotalVote: number;
  TotalPropose: number;
  totalVoteConfirm: number;
  totalEpochCountBlock: number;
}

export interface NodeEarningComplete extends NodeEarningIncomplete {
  Time: string;
  Reward: number;
}

type NodeEarning = NodeEarningComplete | NodeEarningIncomplete;
export default NodeEarning;
