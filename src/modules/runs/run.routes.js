import { Router } from "express";
import { validateRunInput } from "./middleware/run-validation.middleware.js";
import { createRunController } from "./run.controller.js";
export function createRunRoutes(deps) {
  const routes = Router();
  const controller = createRunController(deps);
  routes.post("/", validateRunInput, controller.create);
  routes.get("/:id/artifact", controller.artifact);
  routes.get("/:id", controller.get);
  return routes;
}
