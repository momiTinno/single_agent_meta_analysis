import "dotenv/config";
import { z } from "zod";

const integer = (fallback) => z.coerce.number().int().positive().default(fallback);
const schema = z.object({
  PORT: integer(3000), OPENAI_API_KEY: z.string().default(""),
  OPENAI_AGENT_MODEL: z.string().min(1).default("gpt-5.6"), OPENAI_PHASE_MODEL: z.string().min(1).default("gpt-5.6"),
  OPENAI_MAX_RETRIES: integer(3), OPENAI_TIMEOUT_MS: integer(60000),
  MYSQL_HOST: z.string().min(1).default("127.0.0.1"), MYSQL_PORT: integer(3306), MYSQL_USER: z.string().default(""),
  MYSQL_PASSWORD: z.string().default(""), MYSQL_DATABASE: z.string().default(""), MYSQL_CONNECTION_LIMIT: integer(5),
  MAX_STEPS: integer(20), MAX_ATTEMPTS_PER_PHASE: integer(3), RECOVERY_STALE_SECONDS: integer(30),
  LOG_LEVEL: z.string().default("info")
});
export const config = schema.parse(process.env);
export function assertRuntimeConfig() {
  for (const key of ["OPENAI_API_KEY", "MYSQL_USER", "MYSQL_DATABASE"]) if (!config[key]) throw new Error(`${key} is required`);
}

export const runInputSchema = z.object({
  turns: z.array(z.object({ turn: z.number().int().nonnegative(), speaker: z.string().min(1), sentences: z.record(z.string()) })).min(1),
  bmc: z.record(z.string()).refine((value) => Object.keys(value).length > 0, "bmc must not be empty")
});
