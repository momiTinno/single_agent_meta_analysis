import { describe, expect, it } from "vitest";
import { startSqsWorker } from "../../src/modules/queue/sqs.worker.js";

describe("SQS worker", () => {
  it("runs the durable run and deletes the message after success", async () => {
    let receiveCount = 0;
    let releasePoll;
    const deleted = [];
    const processed = [];
    const queue = {
      receive: async () => {
        receiveCount += 1;
        if (receiveCount === 1) return { Body: '{"runId":"run-1"}', ReceiptHandle: "receipt", MessageId: "message" };
        return new Promise((resolve) => {
          releasePoll = resolve;
        });
      },
      delete: async (receipt) => deleted.push(receipt),
      extendVisibility: async () => {},
    };
    const worker = startSqsWorker({
      queue,
      runAgent: async (runId) => processed.push(runId),
      logger: {
        info() {},
        error() {},
        child() {
          return this;
        },
      },
    });
    while (deleted.length === 0) await new Promise((resolve) => setTimeout(resolve, 1));
    const stopping = worker.stop();
    releasePoll(null);
    await stopping;
    expect(processed).toEqual(["run-1"]);
    expect(deleted).toEqual(["receipt"]);
  });
});
