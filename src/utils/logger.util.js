import pino from "pino";
import { config } from "../config/app.config.js";
export const logger = pino({
  level: config.LOG_LEVEL,
  ...(config.LOG_PRETTY
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname", singleLine: true },
        },
      }
    : {}),
});
export const runLogger = (runId, extra = {}) => logger.child({ runId, ...extra });
