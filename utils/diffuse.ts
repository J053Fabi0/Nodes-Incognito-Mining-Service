import axiod from "axiod";
import { repeatUntilNoError } from "duplicatedFilesCleanerIncognito";

export default async function diffuse() {
  function epochToHeight(epoch: number) {
    return {
      start: epoch * 350 + 1,
      end: (epoch + 1) * 350,
    };
  }

  interface Data {
    lastEpoch: number;
    /** epoch: date */
    data: Record<number | string, { start?: number; end?: number } | undefined>;
  }

  interface Result {
    Result: [
      {
        Height: number;
        Epoch: number;
        Time: number;
      }
    ];
  }

  async function getEpochAndTime(height: number) {
    const { data } = await axiod.post<Result>("https://mainnet.incognito.org/fullnode", {
      id: 1,
      jsonrpc: "1.0",
      params: [height, "2"],
      method: "retrievebeaconblockbyheight",
    });

    return {
      epoch: data.Result[0].Epoch,
      time: new Date(data.Result[0].Time * 1000),
    };
  }

  const data: Data = (await Deno.readFile("epochsDates.json")
    .then((x) => JSON.parse(new TextDecoder().decode(x)))
    .catch(() => {})) || { lastEpoch: -1, data: {} };

  async function loadMore(height: number, isStart: boolean) {
    const { epoch, time } = await repeatUntilNoError(() => getEpochAndTime(height || 1), 20, 1);
    console.log(`Epoch: ${epoch}, Time: ${time}`);

    const key = isStart ? "start" : "end";

    if (!data.data[epoch]) data.data[epoch] = {};

    if (data.data[epoch]![key]) throw new Error(`Epoch ${epoch} already has ${key} defined`);

    data.data[epoch]![key] = +time;
  }

  const simultaneous = 1;

  while (false) {
    await Promise.all(
      Array.from({ length: simultaneous }, (_, i) => epochToHeight(data.lastEpoch + i + 1)).map(async (h) => {
        await loadMore(h.start, true);
        await loadMore(h.end, false);
      })
    );

    data.lastEpoch += simultaneous;

    await Deno.writeFile("epochsDates.json", new TextEncoder().encode(JSON.stringify(data, null, 2)));
  }
}
