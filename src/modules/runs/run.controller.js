import { runResponse } from "../../utils/response.util.js";
import { createRun } from "./run.service.js";
export function createRunController(deps) {
  return {
    create: async (request, response, next) => {
      try {
        response.status(202).json({ runId: await createRun(request.validatedInput, deps) });
      } catch (error) {
        next(error);
      }
    },
    get: async (request, response, next) => {
      try {
        const run = await deps.store.load(request.params.id);
        if (!run) return response.status(404).json({ error: "run not found" });
        return response.json(runResponse(run));
      } catch (error) {
        next(error);
      }
    },
    artifact: async (request, response, next) => {
      try {
        const run = await deps.store.load(request.params.id);
        if (!run) return response.status(404).json({ error: "run not found" });
        if (run.status !== "success")
          return response.status(409).json({ error: "artifact is not ready", status: run.status });
        return response.json({ runId: run.runId, artifact: run.artifact });
      } catch (error) {
        next(error);
      }
    },
    usage: async (request, response, next) => {
      try {
        const run = await deps.store.load(request.params.id);
        if (!run) return response.status(404).json({ error: "run not found" });
        return response.json({ runId: run.runId, usage: run.usage, calls: await deps.store.listModelCalls(run.runId) });
      } catch (error) {
        next(error);
      }
    },
  };
}
