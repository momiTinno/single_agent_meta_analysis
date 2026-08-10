import express from "express";
import { logger as defaultLogger } from "./utils/logger.util.js";
import { createRunRoutes } from "./modules/runs/run.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { notFoundMiddleware } from "./middleware/not-found.middleware.js";

export function createApp({ store, runAgent, logger = defaultLogger } = {}) {
  if (!store || !runAgent) throw new Error("createApp requires a run store and agent runner");
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use("/runs", createRunRoutes({ store, runAgent, logger }));
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
