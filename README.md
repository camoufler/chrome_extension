# Camoufler

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
npm run test
npm run lint
npm run format:check
npm run build
```

The packaged extension is written to `.output/chrome-mv3`.

## Usage

Click the Camoufler logo on a text field to standardize the contents with the on-device model:

1. **Utterance** (slang / grammar with no real ask) — rewrite to standard English, then redact PII.
2. **Prompt** — rewrite the ask into standard English, infer the matching framework’s slots (never fulfill the ask), fold them into **one paragraph**, then redact PII.

Detection is heuristic (keyword scores). A small-model call runs only when the top two scores are close.

| Type                               | Framework | Slots                                                   |
| ---------------------------------- | --------- | ------------------------------------------------------- |
| Factual & Informational            | RTF       | Role, Task, Format                                      |
| Instructional & How-To             | TAG       | Task, Action, Goal                                      |
| Creative & Generative              | CREATE    | Character, Request, Examples, Adjustments, Type, Extras |
| Analytical & Problem-Solving       | RACE      | Role, Action, Context, Expectation                      |
| Transformation & Editing           | TRAC      | Task, Role, Audience, Constraints                       |
| Role-Playing & Scenario Simulation | COAST     | Context, Objective, Actor, Scenario, Tone               |
| Strategic Planning & Advisory      | GRADE     | Goal, Role, Assumptions, Deliverables, Evaluation       |

Emails, phones, keys, and similar tokens become `[EMAIL]`, `[PHONE]`, `[API_KEY]`, and other placeholders. The model fills missing slots as labeled lines; the extension merges those values with defaults and writes one paragraph back into the field.

## Stack

- TypeScript
- Chrome Manifest V3
- React 19
- Vite (via WXT)
- WXT
- ESLint + Prettier
- Vitest
- `wxt/utils/storage` (Chrome `storage.local`)
- `@mlc-ai/web-llm`
