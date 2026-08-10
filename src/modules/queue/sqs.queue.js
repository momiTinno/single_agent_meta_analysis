import { ChangeMessageVisibilityCommand, DeleteMessageCommand, ReceiveMessageCommand, SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { awsConfig } from "../../config/aws.config.js";

export function createSqsQueue({ client = new SQSClient({ region: awsConfig.region }), queueUrl = awsConfig.queueUrl, visibilityTimeoutSeconds = awsConfig.visibilityTimeoutSeconds, longPollSeconds = awsConfig.longPollSeconds } = {}) {
  if (!queueUrl) throw new Error("SQS_QUEUE_URL is required");
  return {
    async enqueueRun(runId) { await client.send(new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: JSON.stringify({ runId }) })); },
    async receive() { const result = await client.send(new ReceiveMessageCommand({ QueueUrl: queueUrl, MaxNumberOfMessages: 1, WaitTimeSeconds: longPollSeconds, VisibilityTimeout: visibilityTimeoutSeconds })); return result.Messages?.[0] || null; },
    async delete(receiptHandle) { await client.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: receiptHandle })); },
    async extendVisibility(receiptHandle) { await client.send(new ChangeMessageVisibilityCommand({ QueueUrl: queueUrl, ReceiptHandle: receiptHandle, VisibilityTimeout: visibilityTimeoutSeconds })); }
  };
}
