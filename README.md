# Prixubot

Fast Express backend for Ollama Cloud chat completions.

## Quick start

```bash
npm install
copy .env.example .env
npm run dev
```

Set `OLLAMA_API_KEY` in `.env`. Never commit the key. The default model is
`gpt-oss-120b`; set `OLLAMA_MODEL` if your Ollama Cloud account exposes the
model under a different tag (for example, `gpt-oss:120b`).

### API

`POST /api/chat`

```json
{
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "stream": true
}
```

With `stream: true`, the endpoint returns Server-Sent Events. Each `data`
event contains a JSON chunk and the stream ends with `data: [DONE]`.
`stream: false` returns the complete Ollama response as JSON.

`GET /health` reports service and Ollama configuration status without exposing
credentials.

## Production

```bash
npm ci --omit=dev
npm start
```

The service listens on `PORT` (default `3000`) and accepts an optional
comma-separated `CORS_ORIGINS` list.

## Deploy to Vercel

This repository includes [`vercel.json`](./vercel.json) and
[`api/index.js`](./api/index.js), which expose the Express app as a Vercel
Node.js function.

1. Import the repository into Vercel.
2. Keep the default build settings; Vercel detects the Node.js function.
3. Add these project environment variables in **Settings > Environment Variables**:

   - `OLLAMA_API_KEY` - your Ollama Cloud API key
   - `OLLAMA_MODEL` - `gpt-oss-120b` (or the model tag enabled for your account)
   - `OLLAMA_BASE_URL` - `https://ollama.com`
   - `CORS_ORIGINS` - your frontend URL, such as `https://your-app.vercel.app`
   - `OLLAMA_TIMEOUT_MS` - `55000` for the Vercel 60-second function limit

After deployment, use `https://<your-project>.vercel.app/health` and
`https://<your-project>.vercel.app/api/chat`. Do not commit `.env` or place
the Ollama key in frontend code.
