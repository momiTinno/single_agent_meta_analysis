import express from "express";
import { randomUUID } from "node:crypto";
import { assertRuntimeConfig, config, runInputSchema } from "./src/config.js";
import { pool } from "./src/db.js";
import { logger } from "./src/logger.js";
import { runStore } from "./src/runStore.js";
import { runAgent } from "./src/agent.js";
import { recoverRuns } from "./src/recovery.js";

const emptyContext = () => ({ phase1: null, phase1Validation: null, phase2: null, phase2Validation: null, phase3: null, phase3Validation: null });
const app = express(); app.use(express.json({ limit: "1mb" }));
app.post("/runs", async (request, response, next) => {
  try {
    const input = runInputSchema.parse(request.body); const runId = randomUUID();
    await runStore.create({ runId, input, messages: [{ role: "user", content: JSON.stringify(input) }], ctx: emptyContext(), attempts: { phase1: 0, phase2: 0, phase3: 0 } });
    logger.info({ runId }, "run_created");
    void runAgent(runId).catch((error) => logger.error({ runId, err: error.message }, "agent_crashed"));
    response.status(202).json({ runId });
  } catch (error) { next(error); }
});
app.get("/runs/:id", async (request, response, next) => {
  try { const run = await runStore.load(request.params.id); if (!run) return response.status(404).json({ error: "run not found" }); return response.json({ runId: run.runId, status: run.status, artifact: run.artifact, error: run.error, attempts: run.attempts, step: run.step }); } catch (error) { next(error); }
});
app.use((error, _request, response, _next) => response.status(error.name === "ZodError" ? 400 : 500).json({ error: error.name === "ZodError" ? "invalid request" : "internal error", details: error.name === "ZodError" ? error.issues : undefined }));

assertRuntimeConfig();
await pool.query("SELECT 1");
await recoverRuns(runStore);
app.listen(config.PORT, () => logger.info({ port: config.PORT }, "server_started"));
