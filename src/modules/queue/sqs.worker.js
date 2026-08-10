import { config } from "../../config/app.config.js";
import { runAgent as defaultRunAgent } from "../../orchestration/agent-loop.js";
import { logger as defaultLogger } from "../../utils/logger.util.js";
import { sleep } from "../../utils/sleep.util.js";

export function startSqsWorker({ queue, runAgent = defaultRunAgent, logger = defaultLogger, heartbeatSeconds = config.SQS_HEARTBEAT_SECONDS } = {}) {
  if (!queue) throw new Error("startSqsWorker requires a queue");
  let active = true;
  const loop = (async () => {
    while (active) {
      try {
        const message = await queue.receive(); if (!message) continue;
        const { runId } = JSON.parse(message.Body || "{}"); if (!runId || !message.ReceiptHandle) throw new Error("Invalid SQS run message");
        const log = logger.child ? logger.child({ runId, sqsMessageId: message.MessageId }) : logger;
        log.info("sqs_message_received");
        const heartbeat = setInterval(() => queue.extendVisibility(message.ReceiptHandle).then(() => log.info("sqs_visibility_extended")).catch((error) => log.error({ err: error.message }, "sqs_visibility_extension_failed")), heartbeatSeconds * 1000);
        try { await runAgent(runId); await queue.delete(message.ReceiptHandle); log.info("sqs_message_deleted"); }
        catch (error) { log.error({ err: error.message }, "sqs_job_failed"); }
        finally { clearInterval(heartbeat); }
      } catch (error) { logger.error({ err: error.message }, "sqs_worker_poll_failed"); if (active) await sleep(1000); }
    }
  })();
  return { stop: async () => { active = false; await loop; } };
}
