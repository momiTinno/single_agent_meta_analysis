import { assertRuntimeConfig, config } from "./config/app.config.js";
import { pool } from "./db/mysql/connection.js";
import { logger } from "./utils/logger.util.js";
import { runStore } from "./modules/runs/services/run-db.service.js";
import { createApp } from "./app.js";
import { createSqsQueue } from "./modules/queue/sqs.queue.js";

assertRuntimeConfig();
await pool.query("SELECT 1");
const queue = createSqsQueue();
const app = createApp({ store: runStore, queue });
app.listen(config.PORT, () => logger.info({ port: config.PORT }, "server_started"));
