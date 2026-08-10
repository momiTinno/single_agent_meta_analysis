import { config } from "./app.config.js";
export const openaiConfig = { agentModel: config.OPENAI_AGENT_MODEL, phaseModel: config.OPENAI_PHASE_MODEL, maxRetries: config.OPENAI_MAX_RETRIES, timeoutMs: config.OPENAI_TIMEOUT_MS };
