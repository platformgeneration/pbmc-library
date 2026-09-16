# PBMC Assistant — OpenAI + Cloudflare Worker

This folder is deployment support. It does **not** belong in the public page path and it contains **no API key**.

## What this does

`platformgeneration.com/create/` remains a static GitHub Pages site. The browser sends only an explicit PBMC Assistant request to this Worker. The Worker keeps the OpenAI key secret, applies CORS/rate limiting, calls the OpenAI Responses API with Structured Outputs, and returns PBMC JSON suggestions.

Default models:
- field suggestions: `gpt-5.6-luna`
- draft / complete / review: `gpt-5.6-terra`

## Deploy with Wrangler

1. Install Node.js if needed.
2. In this directory run:
   `npx wrangler login`
3. Add the OpenAI key as a Worker secret:
   `npx wrangler secret put OPENAI_API_KEY`
   Paste the **new restricted PBMC-specific key** when prompted. Never put the key into a file or GitHub.
4. Deploy:
   `npx wrangler deploy`
5. Wrangler prints a URL such as:
   `https://pbmc-assistant.<account>.workers.dev`
6. For your own browser test, open the PBMC Assistant. If the site says the endpoint is not connected, paste that Worker URL into the connection field. It is stored only in that browser.
7. Once the flow works, edit `assets/pbmc-ai-config.js` in the website repo and set:
   `window.PBMC_AI_ENDPOINT = "https://pbmc-assistant.<account>.workers.dev";`
   Then all visitors get the AI Assistant without setup.

## Security

- The OpenAI API key is only stored as the Worker secret `OPENAI_API_KEY`.
- The frontend never receives the key.
- CORS accepts Platform Generation and local test origins only.
- The included Cloudflare Rate Limiting binding allows 12 assistant requests per minute per browser client identifier.
- OpenAI requests use `store: false`.
- Create a dedicated restricted OpenAI API key for this Worker rather than reusing a broad key.

## Adjust models

The values in `wrangler.jsonc` can be changed without changing the frontend:
- `PBMC_MODEL_FAST`
- `PBMC_MODEL_SMART`

## Transaction review

The review action can return explicit transaction-arrow actions (`add`, `replace`, `remove`). The browser shows each action for approval before changing the canvas. Replace/remove actions target the current `pbmc.flows` array index; add uses `target_index: -1`.
