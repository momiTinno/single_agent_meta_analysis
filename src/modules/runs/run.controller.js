import { runResponse } from "../../utils/response.util.js";
import { createRun } from "./run.service.js";
export function createRunController(deps) {
  return {
    create: async (request, response, next) => { try { response.status(202).json({ runId: await createRun(request.validatedInput, deps) }); } catch (error) { next(error); } },
    get: async (request, response, next) => { try { const run = await deps.store.load(request.params.id); if (!run) return response.status(404).json({ error: "run not found" }); return response.json(runResponse(run)); } catch (error) { next(error); } }
  };
}
