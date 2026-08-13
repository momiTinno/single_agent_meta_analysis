import { describe, expect, it } from "vitest";
import { createRun } from "../../src/modules/runs/run.service.js";

describe("run service", () => {
  it("persists a run before queueing its ID", async () => {
    const events = [];
    const input = { turns: [{ turn: 1, speaker: "user", sentences: { 0: "hello" } }], bmc: { h0: "test" } };
    const runId = await createRun(input, {
      store: { create: async (run) => events.push(["store", run.runId]) },
      queue: { enqueueRun: async (id) => events.push(["queue", id]) },
      logger: { info() {} },
    });
    expect(events).toEqual([
      ["store", runId],
      ["queue", runId],
    ]);
  });
});
