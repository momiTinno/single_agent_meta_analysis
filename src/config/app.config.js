import "dotenv/config";
import { z } from "zod";

const integer = (fallback) => z.coerce.number().int().positive().default(fallback);
const boolean = (fallback = false) =>
  z
    .string()
    .default(String(fallback))
    .transform((value) => value === "true");
const schema = z.object({
  PORT: integer(3000),
  GEMINI_API_KEY: z.string().default(""),
  GEMINI_AGENT_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  GEMINI_PHASE_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  GEMINI_MAX_RETRIES: integer(3),
  GEMINI_TIMEOUT_MS: integer(240000),
  LANGSMITH_TRACING: boolean(),
  LANGSMITH_API_KEY: z.string().default(""),
  LANGSMITH_PROJECT: z.string().min(1).default("meta-analysis-mvp"),
  AWS_REGION: z.string().min(1).default("us-east-1"),
  SQS_QUEUE_URL: z.string().default(""),
  SQS_ENDPOINT_URL: z.union([z.string().url(), z.literal("")]).default(""),
  SQS_VISIBILITY_TIMEOUT_SECONDS: integer(300),
  SQS_HEARTBEAT_SECONDS: integer(120),
  SQS_LONG_POLL_SECONDS: integer(20),
  MYSQL_HOST: z.string().min(1).default("127.0.0.1"),
  MYSQL_PORT: integer(3306),
  MYSQL_USER: z.string().default(""),
  MYSQL_PASSWORD: z.string().default(""),
  MYSQL_DATABASE: z.string().default(""),
  MYSQL_CONNECTION_LIMIT: integer(5),
  MAX_STEPS: integer(20),
  MAX_ATTEMPTS_PER_PHASE: integer(3),
  RECOVERY_STALE_SECONDS: integer(30),
  LOG_LEVEL: z.string().default("info"),
  LOG_PRETTY: boolean(),
  LOG_AGENT_OUTPUT: boolean(),
});
export const config = schema.parse(process.env);
export function assertRuntimeConfig() {
  for (const key of ["GEMINI_API_KEY", "MYSQL_USER", "MYSQL_DATABASE", "SQS_QUEUE_URL"])
    if (!config[key]) throw new Error(`${key} is required`);
}

export const runInputSchema = z.object({
  turns: z
    .array(
      z.object({ turn: z.number().int().nonnegative(), speaker: z.string().min(1), sentences: z.record(z.string()) })
    )
    .min(1),
  bmc: z.record(z.string()).refine((value) => Object.keys(value).length > 0, "bmc must not be empty"),
});
