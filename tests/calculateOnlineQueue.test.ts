import moment from "moment";
import { sleep } from "sleep";
import { onlineQueue } from "../utils/variables.ts";
import { allNodeRoles } from "../utils/getNodesStatus.ts";
import { assertEquals } from "std/assert/assert_equals.ts";
import { maxOnlineMinutesNotStaked } from "../constants.ts";
import calculateOnlineQueue from "../utils/calculateOnlineQueue.ts";
import { assertStrictEquals } from "std/assert/assert_strict_equals.ts";

function emptyQueue() {
  for (const role of allNodeRoles) onlineQueue[role].splice(0, Infinity);
}

const sleepFor = 0.01;

Deno.test("calculateOnlineQueue", async function (t) {
  emptyQueue();
  await sleep(sleepFor);

  await t.step("it's a true record", async function () {
    // @ts-ignore: it's a true record
    delete onlineQueue.NOT_STAKED;
    await sleep(sleepFor);

    assertEquals(onlineQueue.NOT_STAKED, []);
  });

  await t.step("queue should be empty", function () {
    for (const role of allNodeRoles) assertStrictEquals(onlineQueue[role].length, 0);
  });

  await t.step("should add nodes to the queue", async function (t) {
    calculateOnlineQueue([
      { role: "NOT_STAKED", dockerIndex: 0 },
      { role: "NOT_STAKED", dockerIndex: 1 },
    ]);
    await sleep(sleepFor);
    assertStrictEquals(onlineQueue.NOT_STAKED.length, 2);

    await t.step("should not add nodes that are already in the queue", async function (t) {
      const queueCopy = [...onlineQueue.NOT_STAKED];
      const queueRef = onlineQueue.NOT_STAKED;

      calculateOnlineQueue([
        { role: "NOT_STAKED", dockerIndex: 0 },
        { role: "NOT_STAKED", dockerIndex: 1 },
      ]);
      await sleep(sleepFor);

      assertStrictEquals(onlineQueue.NOT_STAKED.length, 2);

      await t.step("should not modify the queue", function () {
        assertEquals(onlineQueue.NOT_STAKED, queueCopy);
        assertStrictEquals(onlineQueue.NOT_STAKED, queueRef);
      });
    });

    await t.step("should remove nodes that are no longer in the queue", async function (t) {
      calculateOnlineQueue([{ role: "NOT_STAKED", dockerIndex: 0 }]);
      await sleep(sleepFor);
      assertStrictEquals(onlineQueue.NOT_STAKED.length, 1);
    });
  });

  emptyQueue();
  calculateOnlineQueue([
    { role: "NOT_STAKED", dockerIndex: 0 },
    { role: "NOT_STAKED", dockerIndex: 1 },
    { role: "NOT_STAKED", dockerIndex: 2 },
    { role: "NOT_STAKED", dockerIndex: 3 },
    { role: "NOT_STAKED", dockerIndex: 4 },
    { role: "NOT_STAKED", dockerIndex: 5 },
    { role: "NOT_STAKED", dockerIndex: 6 },
  ]);
  await sleep(sleepFor);

  // should move to the end the nodes that are in the online range are have been there for more than maxOnlineMinutesNotStaked
  await t.step(
    "should move to the end the nodes that are in the online range are have been there for more than maxOnlineMinutesNotStaked",
    async function () {
      onlineQueue.NOT_STAKED[0].date = moment().subtract(maxOnlineMinutesNotStaked, "minutes").valueOf();
      onlineQueue.NOT_STAKED[1].date = moment()
        .subtract(maxOnlineMinutesNotStaked, "minutes")
        .add(1, "second")
        .valueOf();

      assertStrictEquals(onlineQueue.NOT_STAKED[0].dockerIndex, 0);

      calculateOnlineQueue([
        { role: "NOT_STAKED", dockerIndex: 0 },
        { role: "NOT_STAKED", dockerIndex: 1 },
        { role: "NOT_STAKED", dockerIndex: 2 },
        { role: "NOT_STAKED", dockerIndex: 3 },
        { role: "NOT_STAKED", dockerIndex: 4 },
        { role: "NOT_STAKED", dockerIndex: 5 },
        { role: "NOT_STAKED", dockerIndex: 6 },
      ]);
      await sleep(sleepFor);

      assertStrictEquals(onlineQueue.NOT_STAKED[0].dockerIndex, 1);
      assertStrictEquals(onlineQueue.NOT_STAKED[1].dockerIndex, 2);
      assertStrictEquals(onlineQueue.NOT_STAKED[6].dockerIndex, 0);
    }
  );
});
