import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { chatWithOllama, OllamaError } from './ollama.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins.length ? config.corsOrigins : true,
  credentials: config.corsOrigins.length > 0
}));
app.use(express.json({ limit: '256kb' }));
app.use((error, _request, response, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return response.status(400).json({ error: 'request body must be valid JSON' });
  }
  return next(error);
});

const validRoles = new Set(['system', 'user', 'assistant', 'tool']);
const maxMessages = 50;
const maxContentLength = 32_000;

function validateChatBody(body) {
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > maxMessages) {
    return 'messages must contain between 1 and 50 items';
  }
  for (const message of body.messages) {
    if (!message || !validRoles.has(message.role) || typeof message.content !== 'string' || !message.content.trim() || message.content.length > maxContentLength) {
      return 'each message needs a valid role and non-empty content of at most 32000 characters';
    }
  }
  if (body.options !== undefined && (!body.options || typeof body.options !== 'object' || Array.isArray(body.options))) {
    return 'options must be an object';
  }
  return null;
}

app.get('/health', (_request, response) => {
  response.json({
    status: 'ok',
    ollama: config.ollamaApiKey ? 'configured' : 'missing_api_key',
    model: config.ollamaModel
  });
});

app.post('/api/chat', async (request, response, next) => {
  const validationError = validateChatBody(request.body);
  if (validationError) return response.status(400).json({ error: validationError });

  const stream = request.body.stream !== false;
  try {
    const upstream = await chatWithOllama({
      messages: request.body.messages,
      stream,
      options: request.body.options,
      signal: request.signal
    });

    if (!stream) {
      response.type('application/json');
      return response.send(await upstream.json());
    }

    response.status(200);
    response.set({
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no'
    });
    response.flushHeaders();

    if (!upstream.body) return response.end();
    for await (const chunk of upstream.body) {
      response.write(`data: ${Buffer.from(chunk).toString('utf8').trim()}\n\n`);
    }
    response.write('data: [DONE]\n\n');
    return response.end();
  } catch (error) {
    if (response.headersSent) return response.end();
    return next(error);
  }
});

app.use((error, _request, response, _next) => {
  const status = error instanceof OllamaError ? error.status : 500;
  if (status === 500) console.error(error);
  response.status(status).json({ error: error.message || 'Internal server error' });
});

const server = app.listen(config.port, () => {
  console.log(`Prixubot listening on port ${config.port}`);
});

const shutdown = (signal) => {
  console.log(`${signal} received; shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

export { app };
