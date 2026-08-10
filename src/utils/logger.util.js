import pino from "pino";
import { config } from "../config/app.config.js";
export const logger = pino({ level: config.LOG_LEVEL });
export const runLogger = (runId, extra = {}) => logger.child({ runId, ...extra });
