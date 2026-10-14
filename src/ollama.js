import { config } from './config.js';

const chatUrl = `${config.ollamaBaseUrl}/api/chat`;

export class OllamaError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'OllamaError';
    this.status = status;
  }
}

const headers = {
  accept: 'application/x-ndjson, application/json',
  'content-type': 'application/json',
  'user-agent': 'prixubot/1.0'
};

if (config.ollamaApiKey) {
  headers.authorization = `Bearer ${config.ollamaApiKey}`;
}

export async function chatWithOllama({ messages, stream, options, signal }) {
  const timeoutSignal = AbortSignal.timeout(config.ollamaTimeoutMs);
  const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  try {
    const response = await fetch(chatUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.ollamaModel,
        messages,
        stream,
        ...(options ? { options } : {})
      }),
      signal: requestSignal
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new OllamaError(`Ollama request failed (${response.status}): ${detail}`, response.status >= 400 && response.status < 500 ? response.status : 502);
    }

    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new OllamaError('Ollama request timed out or was cancelled', 504);
    }
    if (error instanceof OllamaError) throw error;
    throw new OllamaError(`Unable to reach Ollama: ${error.message}`, 502);
  }
}
