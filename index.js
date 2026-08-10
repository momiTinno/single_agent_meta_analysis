import { assertRuntimeConfig, config } from "./src/config.js";
import { pool } from "./src/db.js";
import { logger } from "./src/logger.js";
import { runStore } from "./src/runStore.js";
import { recoverRuns } from "./src/recovery.js";
import { createApp } from "./src/app.js";

assertRuntimeConfig();
await pool.query("SELECT 1");
await recoverRuns(runStore);
const app = createApp({ store: runStore });
app.listen(config.PORT, () => logger.info({ port: config.PORT }, "server_started"));
