import axiod from "axiod";
import msToTimeDescription from "./msToTimeDescription.ts";

export default async function diffuse() {
  /** The key is the epoch */
  interface Data {
    lastHeight: number;
    data: Record<string, { height: number; time: number }[] | undefined>;
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

  const data: Data = (await Deno.readFile("data.json")
    .then((x) => JSON.parse(new TextDecoder().decode(x)))
    .catch(() => {})) || { lastHeight: 4045972, data: {} };

  function getMax(arr: number[]) {
    let max = -Infinity;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] > max) {
        max = arr[i];
      }
    }
    return max;
  }

  function getMin(arr: number[]) {
    let min = Infinity;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] < min) {
        min = arr[i];
      }
    }
    return min;
  }

  // For epoches
  console.log("Epoches");
  {
    const entries = Object.entries(data.data).filter(([, value]) => (value?.length || 0) === 350);
    const ranges: number[] = [];
    for (const [, data] of entries) {
      if (!data) continue;
      const maxDate = Math.max(...data.map((x) => x.time));
      const minDate = Math.min(...data.map((x) => x.time));
      ranges.push(maxDate - minDate);
    }
    console.table({
      ["Total epoches"]: ranges.length,
      ["Mean duration"]: msToTimeDescription(ranges.reduce((a, b) => a + b, 0) / ranges.length),
      ["Max duration"]: msToTimeDescription(Math.max(...ranges)),
      ["Min duration"]: msToTimeDescription(Math.min(...ranges)),
    });

    const rangesTimesCount: Record<string, number> = {};
    for (const range of ranges) {
      if (!rangesTimesCount[range]) rangesTimesCount[range] = 0;
      rangesTimesCount[range]++;
    }

    console.table(
      Object.fromEntries(
        Object.entries(rangesTimesCount)
          .sort(([a], [b]) => +a - +b)
          .map(([range, count]) => [msToTimeDescription(+range, { short: true }), count])
      )
    );
  }

  // For blocks
  console.log("\nBlocks");
  {
    const allBlocks = (Object.values(data.data).flat().filter(Boolean) as { height: number; time: number }[]).sort(
      (a, b) => a.height - b.height
    );
    const ranges: number[] = [];

    // check that all blocks are sequential and there are no blocks missing
    for (let i = 0; i < allBlocks.length - 1; i++) {
      if (allBlocks[i].height + 1 !== allBlocks[i + 1].height) {
        console.error(`Missing blocks between ${allBlocks[i].height} and ${allBlocks[i + 1].height}`);
      }
    }

    for (let i = 0; i < allBlocks.length - 1; i++) {
      const block1 = allBlocks[i];
      const block2 = allBlocks[i + 1];
      ranges.push(block2.time - block1.time);
    }

    console.table({
      ["Total blocks"]: allBlocks.length,
      ["Mean duration"]: msToTimeDescription(ranges.reduce((a, b) => a + b, 0) / ranges.length),
      ["Max duration"]: msToTimeDescription(getMax(ranges)),
      ["Min duration"]: msToTimeDescription(getMin(ranges)),
    });

    const rangesTimesCount: Record<string, number> = {};
    for (const range of ranges) {
      if (!rangesTimesCount[range]) rangesTimesCount[range] = 0;
      rangesTimesCount[range]++;
    }

    console.table(
      Object.fromEntries(
        Object.entries(rangesTimesCount)
          .sort(([a], [b]) => +a - +b)
          .map(([range, count]) => [msToTimeDescription(+range, { short: true }), count])
      )
    );
  }

  async function loadMore(height: number) {
    const { epoch, time } = await getEpochAndTime(height);
    console.log(`Height: ${height}, Epoch: ${epoch}, Time: ${time}`);

    if (!data.data[epoch]) data.data[epoch] = [];
    if (!data.data[epoch]!.find((x) => x.height === height))
      data.data[epoch]!.push({ height, time: time.getTime() });
  }

  const simultaneous = 50;
  while (false) {
    try {
      await Promise.all(
        Array.from({ length: simultaneous }, (_, i) => data.lastHeight - i).map((h) => loadMore(h))
      );

      data.lastHeight -= simultaneous;

      await Deno.writeFile("data.json", new TextEncoder().encode(JSON.stringify(data, null, 2)));
    } catch (e) {
      console.error(e);
    }
  }
}
