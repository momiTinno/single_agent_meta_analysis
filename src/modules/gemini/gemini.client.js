import { config } from "../../config/app.config.js";
import { sleep } from "../../utils/sleep.util.js";

export async function callGemini({ model, ...body }, { fetchImpl = fetch } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= config.GEMINI_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.GEMINI_TIMEOUT_MS);
    try {
      const response = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "x-goog-api-key": config.GEMINI_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );
      const payload = await response.json();
      if (response.ok) return payload;
      if (!(response.status === 429 || response.status >= 500))
        throw new Error(`Gemini ${response.status}: ${JSON.stringify(payload)}`);
      lastError = new Error(`Gemini ${response.status}`);
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
    if (attempt < config.GEMINI_MAX_RETRIES) await sleep(250 * 2 ** attempt);
  }
  throw lastError;
}

export function candidateContent(response) {
  const content = response.candidates?.[0]?.content;
  if (!content) throw new Error("Gemini result did not contain candidate content");
  return content;
}
export function outputText(response) {
  const text = candidateContent(response)
    .parts?.filter((part) => part.text)
    .map((part) => part.text)
    .join("");
  if (!text) throw new Error("Gemini result did not contain text");
  return text;
}

const tokenCount = (value) => (Number.isSafeInteger(value) && value >= 0 ? value : 0);
export function usageMetadata(response) {
  const metadata = response.usageMetadata;
  if (!metadata) {
    return {
      inputTokens: 0,
      outputTokens: 0,
      thoughtsTokens: 0,
      cachedTokens: 0,
      toolUsePromptTokens: 0,
      totalTokens: 0,
      usageAvailable: false,
    };
  }
  return {
    inputTokens: tokenCount(metadata.promptTokenCount),
    outputTokens: tokenCount(metadata.candidatesTokenCount),
    thoughtsTokens: tokenCount(metadata.thoughtsTokenCount),
    cachedTokens: tokenCount(metadata.cachedContentTokenCount),
    toolUsePromptTokens: tokenCount(metadata.toolUsePromptTokenCount),
    totalTokens: tokenCount(metadata.totalTokenCount),
    usageAvailable: true,
  };
}
