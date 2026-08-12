import { describe, expect, it } from "vitest";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { createSqsQueue } from "../../src/modules/queue/sqs.queue.js";

describe("SQS queue", () => {
  it("enqueues only the durable run ID", async () => {
    const commands = [];
    const queue = createSqsQueue({
      queueUrl: "https://sqs.example/runs",
      client: { send: async (command) => commands.push(command) },
    });
    await queue.enqueueRun("run-123");
    expect(commands[0]).toBeInstanceOf(SendMessageCommand);
    expect(commands[0].input).toMatchObject({
      QueueUrl: "https://sqs.example/runs",
      MessageBody: '{"runId":"run-123"}',
    });
  });
});
