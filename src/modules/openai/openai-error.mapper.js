export const isRetryableOpenAIStatus = (status) => status === 429 || status >= 500;
