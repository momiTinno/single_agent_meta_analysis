import express from "express";
import { randomUUID } from "node:crypto";
import { runInputSchema } from "./config.js";
import { logger as defaultLogger } from "./logger.js";
import { runAgent as defaultRunAgent } from "./agent.js";

const emptyContext = () => ({ phase1: null, phase1Validation: null, phase2: null, phase2Validation: null, phase3: null, phase3Validation: null });

export function createApp({ store, runAgent = defaultRunAgent, logger = defaultLogger } = {}) {
  if (!store) throw new Error("createApp requires a run store");
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.post("/runs", async (request, response, next) => {
    try {
      const input = runInputSchema.parse(request.body); const runId = randomUUID();
      await store.create({ runId, input, messages: [{ role: "user", content: JSON.stringify(input) }], ctx: emptyContext(), attempts: { phase1: 0, phase2: 0, phase3: 0 } });
      logger.info({ runId }, "run_created");
      void runAgent(runId, { store }).catch((error) => logger.error({ runId, err: error.message }, "agent_crashed"));
      response.status(202).json({ runId });
    } catch (error) { next(error); }
  });
  app.get("/runs/:id", async (request, response, next) => {
    try { const run = await store.load(request.params.id); if (!run) return response.status(404).json({ error: "run not found" }); return response.json({ runId: run.runId, status: run.status, artifact: run.artifact, error: run.error, attempts: run.attempts, step: run.step }); } catch (error) { next(error); }
  });
  app.use((error, _request, response, _next) => response.status(error.name === "ZodError" ? 400 : 500).json({ error: error.name === "ZodError" ? "invalid request" : "internal error", details: error.name === "ZodError" ? error.issues : undefined }));
  return app;
}
