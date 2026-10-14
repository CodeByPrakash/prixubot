import 'dotenv/config';

const positiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const origins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const config = Object.freeze({
  port: positiveInteger(process.env.PORT, 3000),
  ollamaApiKey: process.env.OLLAMA_API_KEY ?? '',
  ollamaBaseUrl: (process.env.OLLAMA_BASE_URL ?? 'https://ollama.com').replace(/\/+$/, ''),
  ollamaModel: process.env.OLLAMA_MODEL ?? 'gpt-oss-120b',
  ollamaTimeoutMs: positiveInteger(process.env.OLLAMA_TIMEOUT_MS, 120000),
  corsOrigins: origins
});
