import { config } from "./config.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function callOpenAI(body, { fetchImpl = fetch } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= config.OPENAI_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.OPENAI_TIMEOUT_MS);
    try {
      const response = await fetchImpl("https://api.openai.com/v1/responses", {
        method: "POST", headers: { Authorization: `Bearer ${config.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body), signal: controller.signal
      });
      const payload = await response.json();
      if (response.ok) return payload;
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable) throw new Error(`OpenAI ${response.status}: ${JSON.stringify(payload)}`);
      lastError = new Error(`OpenAI ${response.status}`);
    } catch (error) { lastError = error; }
    finally { clearTimeout(timeout); }
    if (attempt < config.OPENAI_MAX_RETRIES) await delay(250 * 2 ** attempt);
  }
  throw lastError;
}

export function outputText(response) {
  const text = response.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  if (!text) throw new Error("Responses API result did not contain output_text");
  return text;
}
