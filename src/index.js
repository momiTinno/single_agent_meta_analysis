import { assertRuntimeConfig, config } from "./config/app.config.js";
import { pool } from "./db/mysql/connection.js";
import { logger } from "./utils/logger.util.js";
import { runStore } from "./modules/runs/services/run-db.service.js";
import { recoverRuns } from "./modules/runs/services/run-recovery.service.js";
import { createApp } from "./app.js";
import { runAgent } from "./orchestration/agent-loop.js";
import { createSqsQueue } from "./modules/queue/sqs.queue.js";
import { startSqsWorker } from "./modules/queue/sqs.worker.js";

assertRuntimeConfig();
await pool.query("SELECT 1");
await recoverRuns(runStore);
const queue = createSqsQueue();
startSqsWorker({ queue, runAgent, logger });
const app = createApp({ store: runStore, queue });
app.listen(config.PORT, () => logger.info({ port: config.PORT }, "server_started"));
