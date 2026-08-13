import { config } from "../../config/app.config.js";
import { runAgent as defaultRunAgent } from "../../orchestration/agent-loop.js";
import { logger as defaultLogger } from "../../utils/logger.util.js";
import { sleep } from "../../utils/sleep.util.js";

export function startSqsWorker({
  queue,
  runAgent = defaultRunAgent,
  logger = defaultLogger,
  heartbeatSeconds = config.SQS_HEARTBEAT_SECONDS,
} = {}) {
  if (!queue) throw new Error("startSqsWorker requires a queue");
  let active = true;
  const loop = (async () => {
    while (active) {
      try {
        const message = await queue.receive();
        if (!message) continue;
        const { runId } = JSON.parse(message.Body || "{}");
        if (!runId || !message.ReceiptHandle) throw new Error("Invalid SQS run message");
        const receivedAt = Date.now();
        const receiveCount = Number(message.Attributes?.ApproximateReceiveCount) || undefined;
        const log = logger.child
          ? logger.child({ runId, sqsMessageId: message.MessageId, sqsReceiveCount: receiveCount })
          : logger;
        log.info(
          { event: "sqs_message_received", visibilityTimeoutSeconds: config.SQS_VISIBILITY_TIMEOUT_SECONDS },
          "sqs_message_received"
        );
        const heartbeat = setInterval(
          () =>
            queue
              .extendVisibility(message.ReceiptHandle)
              .then(() =>
                log.info(
                  { event: "sqs_visibility_extended", visibilityTimeoutSeconds: config.SQS_VISIBILITY_TIMEOUT_SECONDS },
                  "sqs_visibility_extended"
                )
              )
              .catch((error) =>
                log.error(
                  { event: "sqs_visibility_extension_failed", err: error.message },
                  "sqs_visibility_extension_failed"
                )
              ),
          heartbeatSeconds * 1000
        );
        try {
          log.info({ event: "sqs_job_started" }, "sqs_job_started");
          const terminalStatus = await runAgent(runId);
          await queue.delete(message.ReceiptHandle);
          log.info(
            { event: "sqs_message_deleted", terminalStatus, durationMs: Date.now() - receivedAt },
            "sqs_message_deleted"
          );
        } catch (error) {
          log.error(
            { event: "sqs_job_failed", err: error.message, durationMs: Date.now() - receivedAt },
            "sqs_job_failed"
          );
        } finally {
          clearInterval(heartbeat);
        }
      } catch (error) {
        logger.error({ event: "sqs_worker_poll_failed", err: error.message }, "sqs_worker_poll_failed");
        if (active) await sleep(1000);
      }
    }
  })();
  return {
    stop: async () => {
      active = false;
      await loop;
    },
  };
}
