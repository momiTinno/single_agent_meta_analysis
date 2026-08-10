import { config } from "./app.config.js";
export const geminiConfig = { agentModel: config.GEMINI_AGENT_MODEL, phaseModel: config.GEMINI_PHASE_MODEL, maxRetries: config.GEMINI_MAX_RETRIES, timeoutMs: config.GEMINI_TIMEOUT_MS };
