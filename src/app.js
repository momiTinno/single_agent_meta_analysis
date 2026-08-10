import express from "express";
import { logger as defaultLogger } from "./utils/logger.util.js";
import { createRunRoutes } from "./modules/runs/run.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { notFoundMiddleware } from "./middleware/not-found.middleware.js";

export function createApp({ store, queue, logger = defaultLogger } = {}) {
  if (!store || !queue) throw new Error("createApp requires a run store and queue");
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use("/runs", createRunRoutes({ store, queue, logger }));
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
