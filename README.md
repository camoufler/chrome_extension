# Camoufler

Camoufler is a Chrome Manifest V3 extension that helps protect user identity when interacting with AI chat platforms. It overlays form controls and adds a local protection flow for chat input fields on supported AI-provider sites. The extension keeps the model and rewrite logic on-device and stores settings in Chrome storage.

## What it does

- Detects supported AI-provider pages such as ChatGPT, OpenAI Chat, Claude, Bing Chat, Copilot, Gemini, Perplexity, Poe, You.com, Grok, DeepSeek, Mistral, OpenRouter, and Hugging Face Chat.
- Scans the page for input fields that need protection.
- Places a lightweight overlay icon next to relevant fields.
- Uses a local WebLLM-powered model to rewrite sensitive text before sending it to AI.
- Keeps user settings and model preferences in browser storage.

## Supported sites

The extension is intentionally scoped to AI-provider pages instead of all websites. Current supported patterns include:

- `https://chatgpt.com/*`
- `https://chat.openai.com/*`
- `https://claude.ai/*`
- `https://*.claude.ai/*`
- `https://copilot.microsoft.com/*`
- `https://www.bing.com/*`
- `https://*.githubcopilot.com/*`
- `https://github.com/*`
- `https://gemini.google.com/*`
- `https://www.perplexity.ai/*`
- `https://*.perplexity.ai/*`
- `https://poe.com/*`
- `https://*.poe.com/*`
- `https://you.com/*`
- `https://www.you.com/*`
- `https://grok.com/*`
- `https://x.ai/*`
- `https://chat.deepseek.com/*`
- `https://deepseek.com/*`
- `https://chat.mistral.ai/*`
- `https://app.mistral.ai/*`
- `https://openrouter.ai/*`
- `https://*.openrouter.ai/*`
- `https://huggingface.co/*`

## Development

```bash
npm install
npm run dev
```

Load the unpacked build from `.output/chrome-mv3-dev` if the browser does not open automatically.

## Production / verification

```bash
npm run compile
npm run lint
npm run format:check
npm run build
```

The packaged extension is written to `.output/chrome-mv3`.

## Tech stack

- TypeScript
- Chrome Manifest V3
- React 19
- Vite via WXT
- WXT
- ESLint + Prettier
- `wxt/utils/storage` for Chrome `storage.local`
- `@mlc-ai/web-llm`

## Notes

- This extension is designed around AI application workflows rather than arbitrary websites.
- It does not require broad site access outside the supported AI-provider list.
- Local model inference is intended to keep the privacy-preserving rewriting logic on-device.
