export const isRetryableGeminiStatus = (status) => status === 429 || status >= 500;
