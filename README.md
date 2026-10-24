# PrintFlow AI 🖨️

> Automated unstructured order-to-JSON intake pipeline — powered by **Google Gemma 4 (26B-A4B)** function calling.

---

## Quick Start

### 1. Add your Gemini API key

```bash
cd server
cp .env.example .env
# Open .env and paste your GEMINI_API_KEY
```

### 2. Smoke-test the model (do this first!)

Verifies function calling works and lists available models before running the full server.

```bash
cd server
node smoke-test.js
```

Expected output: `✅  Function call OK` for at least one model.

### 3. Run both apps

From the **root** of the project:

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| React dashboard | http://localhost:5173 |
| Express API | http://localhost:5000 |
| Health check | http://localhost:5000/api/health |

---

## Acceptance Criteria (test these with the 3 presets)

| Preset | Expected behaviour |
|--------|--------------------|
| **Urgent Multi-Item** ("Salam! Need 500 matte business cards...") | `isUrgent: true`, 2 items (business cards + flex banner), gold foil in notes, customer phone present |
| **Messy / Vague** ("Hey bro send me flyers 1000 pcs...") | `missingDetails` includes flyer size AND customer phone; amber alert visible in UI |
| **Corporate Bulk** ("Official PO: 250 laminated staff badges...") | 2+ items, sarah@company.com parsed, `isUrgent: false` |

---

## Architecture

```
printflow-ai/
├── package.json          ← root: npm run dev (concurrently)
├── server/
│   ├── index.js          ← Express API + Gemma 4 integration
│   ├── smoke-test.js     ← verify model before going live
│   ├── .env.example      ← copy → .env, add API key
│   └── orders.json       ← auto-created, survives restarts
└── client/
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── Header.jsx
    │   │   ├── IntakeTerminal.jsx   ← left pane
    │   │   ├── OrderStream.jsx      ← right pane wrapper
    │   │   ├── OrderCard.jsx        ← ticket card with all features
    │   │   └── StatusDropdown.jsx   ← inline status update
    │   └── utils/whatsapp.js        ← bilingual EN + Roman Urdu template
    └── vite.config.js               ← /api proxy → :5000
```

---

## API Reference

| Method | Endpoint | Body / Params | Description |
|--------|----------|---------------|-------------|
| `POST` | `/api/parse-order` | `{ rawInput: string }` | Calls Gemma, returns structured order |
| `GET` | `/api/orders` | — | All orders, newest first |
| `PATCH` | `/api/orders/:id/status` | `{ status: string }` | Update ticket status |
| `GET` | `/api/health` | — | Health + order count |

Valid statuses: `Pending Intake` · `In Production` · `Ready for Dispatch`

---

## Security Notes (relevant for CNSP)

- **Prompt injection guard**: system framing separates customer data from instructions.
- **API key server-side only**: never exposed to the client.
- **Input length cap**: 4,000 characters max to limit prompt stuffing.
- **Zod validation**: model output validated server-side — hallucinated schemas rejected with 422.
- **`.env` in `.gitignore`**: key never committed.

---

## Model Fallback Chain

`gemma-4-26b-a4b-it` → `gemma-4-31b-it` → `gemini-2.0-flash`

Each model is tried twice (retry on no-function-call response) before falling through.
Run `node smoke-test.js` to see which model is active on your API key.
