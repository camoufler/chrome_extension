# AICamouflage

Chrome Manifest V3 extension built with **WXT**, **Vite**, **React**, and **TypeScript**. It scans the active tab for text fields and draws the extension logo on the right side of each one. Optional on-device inference uses **WebLLM**. Settings persist in **Chrome Storage**.

## Development

```bash
npm install
npm run dev
```

Load the unpacked build from `.output/chrome-mv3-dev` if the browser does not open automatically.

## Production

```bash
npm run compile
npm run lint
npm run format:check
npm run build
```

The packaged extension is written to `.output/chrome-mv3`.

## Usage

1. Open any web page with text inputs, search boxes, or textareas.
2. The AICamouflage logo appears on the right side of eligible fields.
3. Open the toolbar popup to toggle overlays, change logo size, or load a WebLLM model.

Password, hidden, and non-text controls are ignored.

## Stack

- TypeScript
- Chrome Manifest V3
- React 19
- Vite (via WXT)
- WXT
- ESLint + Prettier
- `wxt/utils/storage` (Chrome `storage.local`)
- `@mlc-ai/web-llm`
