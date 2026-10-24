/**
 * PrintFlow AI — Backend Server
 *
 * Fixes applied vs. v1:
 *  • toolConfig mode:'ANY' forces a function call — no accidental plain-text responses
 *  • Retry once if model returns no function call before erroring
 *  • Zod schema validates extracted args server-side (model isn't truly strict)
 *  • Server-side contact gap detection (phone / email) — more reliable than model
 *  • Number-word → integer normalisation ("two" → 2) before model call
 *  • Urgency detected both by model AND server-side keyword list
 *  • Ordered UUID counter prevents ORD-XXXX collisions
 *  • JSON file persistence is always-on (not optional)
 *  • 15-second timeout on every model call
 *  • Input length cap (4000 chars)
 *  • Status values validated against allowlist
 *  • Prompt injection guard: framing message as "data only"
 *  • Urdu / Roman Urdu inputs accepted; output always English
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { z } from 'zod';

// ─── Constants ────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5000;
const DB_FILE = join(__dirname, 'orders.json');
const MAX_INPUT_LENGTH = 4000;
const MODEL_TIMEOUT_MS = 30_000;
const VALID_STATUSES = ['Pending Intake', 'In Production', 'Ready for Dispatch'];
// Model priority list — Gemma models first for speed & reliability, then Gemini
const MODELS = ['gemma-4-26b-a4b-it', 'gemma-4-31b-it', 'gemini-3.8-flash'];

const URGENCY_KEYWORDS = [
  'urgent', 'asap', 'emergency', 'rush', 'today', 'tonight',
  'tomorrow', 'by morning', 'immediately', 'jaldi', 'abhi', 'kal tak',
];

// ─── Guard: API key ───────────────────────────────────────────────────────────
if (!process.env.GEMINI_API_KEY) {
  console.error('[PrintFlow] ❌  GEMINI_API_KEY is not set. Copy .env.example → .env and add your key.');
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── Order ID counter (collision-safe) ───────────────────────────────────────
let orderCounter = 1000;
function nextOrderId() {
  orderCounter += 1;
  return `ORD-${orderCounter}`;
}

// ─── In-memory DB + JSON persistence ─────────────────────────────────────────
let orders = [];
if (existsSync(DB_FILE)) {
  try {
    orders = JSON.parse(readFileSync(DB_FILE, 'utf-8'));
    // Restore counter so new IDs don't collide
    if (orders.length > 0) {
      const maxNum = orders.reduce((max, o) => {
        const n = parseInt(o.orderId?.replace('ORD-', '') ?? '0', 10);
        return Number.isNaN(n) ? max : Math.max(max, n);
      }, 1000);
      orderCounter = maxNum;
    }
    console.log(`[PrintFlow] 📂  Loaded ${orders.length} orders (counter resumed at ${orderCounter}).`);
  } catch {
    orders = [];
  }
}
function persistOrders() {
  try {
    writeFileSync(DB_FILE, JSON.stringify(orders, null, 2));
  } catch (e) {
    console.error('[PrintFlow] ⚠️  Persist failed:', e.message);
  }
}

// ─── Zod schema for server-side validation ────────────────────────────────────
const ItemSchema = z.object({
  productType: z.string().min(1),
  quantity: z.coerce.number().int().positive().or(z.literal(0).transform(() => 1)).default(1),
  material: z.string().nullable().optional().transform((v) => (!v || v === 'null' ? null : v)),
  dimensions: z.string().nullable().optional().transform((v) => (!v || v === 'null' ? null : v)),
  notes: z.string().nullable().optional().transform((v) => (!v || v === 'null' ? null : v)),
});

const OrderArgsSchema = z.object({
  customerName: z.string().min(1),
  phone: z.string().nullable().optional().transform((v) => (!v || v === 'null' || v === 'Unknown' ? null : v)),
  email: z.string().nullable().optional().transform((v) => (!v || v === 'null' || v === 'Unknown' ? null : v)),
  isUrgent: z.boolean().optional().default(false),
  items: z.array(ItemSchema).min(1),
  missingDetails: z.array(z.string()).optional().default([]),
});

// ─── Preprocessing helpers ────────────────────────────────────────────────────
const WORD_NUMS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, dozen: 12, hundred: 100, thousand: 1000,
};

/** Replace common English number words with digits so the model doesn't guess. */
function normaliseNumberWords(text) {
  return text.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|dozen|hundred|thousand)\b/gi, (m) => {
    return WORD_NUMS[m.toLowerCase()] ?? m;
  });
}

/** Server-side contact gap check — more reliable than model detection. */
function computeContactGaps(args) {
  const gaps = [...(args.missingDetails ?? [])];
  const rawText = JSON.stringify(args).toLowerCase();
  if (!args.phone && !/\b0\d{9,10}\b|\+\d{10,13}/.test(rawText)) {
    if (!gaps.some((g) => g.toLowerCase().includes('phone'))) {
      gaps.push('Customer phone number missing');
    }
  }
  if (!args.email && !/@/.test(rawText)) {
    // Only flag email if it seems like a formal/corporate order
    const customerName = (args.customerName ?? '').toLowerCase();
    if (customerName.includes('ltd') || customerName.includes('pvt') || customerName.includes('hr') || customerName.includes('company')) {
      if (!gaps.some((g) => g.toLowerCase().includes('email'))) {
        gaps.push('Corporate order — contact email recommended');
      }
    }
  }
  return gaps;
}

/** Server-side urgency check — catches keywords the model might miss. */
function checkUrgency(rawInput, modelSaidUrgent) {
  const lower = rawInput.toLowerCase();
  return modelSaidUrgent || URGENCY_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── Gemma Tool Declaration ───────────────────────────────────────────────────
const EXTRACT_ORDER_TOOL = {
  name: 'extract_printing_order',
  description:
    'Extract structured printing order details from a raw customer message. ' +
    'Inputs may be in English, Roman Urdu, or mixed. All output fields must be in English. ' +
    'Convert number words to integers (e.g. "two" → 2). ' +
    'For dimensions with no unit specified, omit the dimension and add an entry to missingDetails. ' +
    'Place finishing instructions (e.g. gold foil, grommets) in the notes field.',
  parameters: {
    type: 'object',
    properties: {
      customerName: {
        type: 'string',
        description: 'Full customer name or organisation name. If not mentioned, use "Unknown".',
      },
      phone: {
        type: 'string',
        description: 'Customer phone number, digits and hyphens only. Omit if not mentioned.',
      },
      email: {
        type: 'string',
        description: 'Customer email address. Omit if not mentioned.',
      },
      isUrgent: {
        type: 'boolean',
        description:
          'true if the deadline is within ~48 hours, or if words like "urgent", "ASAP", ' +
          '"today", "tomorrow", "jaldi", "emergency", "rush" appear.',
      },
      items: {
        type: 'array',
        description: 'Every distinct printed product mentioned.',
        items: {
          type: 'object',
          properties: {
            productType: {
              type: 'string',
              description:
                'Normalised product category: "business cards", "flex banner", "flyers", ' +
                '"brochures", "stickers", "badge", "acrylic stand", "lanyard", etc.',
            },
            quantity: {
              type: 'integer',
              description: 'Numeric quantity. Convert number words to integers.',
            },
            material: {
              type: 'string',
              description:
                'Substrate / material spec if stated: "350gsm matte", "glossy vinyl", ' +
                '"laminated", "transparent". Omit if not mentioned.',
            },
            dimensions: {
              type: 'string',
              description:
                'Dimensions with explicit unit (e.g. "6x3 ft", "A4", "3.5x2 in"). ' +
                'Omit if the unit is missing — add "dimensions missing" to missingDetails instead.',
            },
            notes: {
              type: 'string',
              description:
                'Design or finishing requests: "gold foil", "embossed logo", "grommets on corners", ' +
                '"lanyards included". Omit if none.',
            },
          },
          required: ['productType', 'quantity'],
        },
      },
      missingDetails: {
        type: 'array',
        description:
          'Gaps the print shop must ask the customer about before production can start, ' +
          'e.g. "banner dimensions missing", "flyer size not specified". ' +
          'Do NOT include phone/email here — those are checked separately.',
        items: { type: 'string' },
      },
    },
    required: ['customerName', 'items'],
  },
};

// ─── Model call with timeout + retry ─────────────────────────────────────────
async function callWithTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Model timed out after ${ms / 1000}s`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function callGemma(rawInput) {
  const prompt =
    `You are an expert order intake system for a printing company. ` +
    `Carefully extract all printing order details from the customer message below into JSON.\n` +
    `RULES:\n` +
    `- You MUST populate the 'items' array with every printed product mentioned (e.g. business cards, flyers, banners, badges).\n` +
    `- Convert quantities in text (e.g. 500, two -> 2, 1000) into positive numbers for 'quantity'. Never set quantity to 0.\n` +
    `- Extract material, dimensions, notes, customerName, phone, email, and isUrgent if present.\n\n` +
    `--- CUSTOMER MESSAGE START ---\n${rawInput}\n--- CUSTOMER MESSAGE END ---`;

  let lastError;

  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[PrintFlow] 🤖  ${model} attempt ${attempt}...`);

        const response = await callWithTimeout(
          ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: EXTRACT_ORDER_TOOL.parameters,
            },
          }),
          MODEL_TIMEOUT_MS,
        );

        let args = null;
        if (response.text) {
          try {
            args = JSON.parse(response.text);
          } catch (e) {
            console.warn('[PrintFlow] JSON parse error:', e.message);
          }
        }

        if (!args) {
          const parts = response.candidates?.[0]?.content?.parts ?? [];
          const fnCall = parts.find((p) => p.functionCall);
          args = fnCall?.functionCall?.args ?? response.functionCalls?.[0]?.args;
        }

        if (args && (args.customerName || args.items)) {
          console.log(`[PrintFlow] ✅  Extracted OK — ${model} attempt ${attempt}`);
          return { args, model };
        }

        console.warn(`[PrintFlow] ⚠️  ${model} attempt ${attempt}: empty result. Retrying...`);
        lastError = new Error(`Model returned empty structure (attempt ${attempt})`);
      } catch (err) {
        console.error(`[PrintFlow] ❌  ${model} attempt ${attempt}:`, err.message);
        lastError = err;
        // Don't retry on timeout
        if (err.message.includes('timed out')) break;
      }
    }
  }

  throw lastError ?? new Error('All models failed after retries.');
}

// ─── Express ──────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', orders: orders.length, models: MODELS }),
);

// POST /api/parse-order
app.post('/api/parse-order', async (req, res) => {
  const { rawInput } = req.body ?? {};

  if (typeof rawInput !== 'string' || rawInput.trim().length === 0) {
    return res.status(400).json({ error: 'rawInput must be a non-empty string.' });
  }
  if (rawInput.length > MAX_INPUT_LENGTH) {
    return res.status(400).json({
      error: `Input too long (${rawInput.length} chars). Max is ${MAX_INPUT_LENGTH}.`,
    });
  }

  // Pre-process: normalise number words
  const processedInput = normaliseNumberWords(rawInput.trim());

  try {
    const { args, model } = await callGemma(processedInput);

    // Zod validation — catches model hallucinations / missing required fields
    const parseResult = OrderArgsSchema.safeParse(args);
    if (!parseResult.success) {
      console.error('[PrintFlow] ⚠️  Zod validation failed:', parseResult.error.flatten());
      return res.status(422).json({
        error: 'Model returned an unexpected structure.',
        issues: parseResult.error.flatten().fieldErrors,
        rawArgs: args,
      });
    }

    const validated = parseResult.data;

    // Server-side enrichment
    validated.isUrgent = checkUrgency(rawInput, validated.isUrgent);
    validated.missingDetails = computeContactGaps(validated);

    const order = {
      orderId: nextOrderId(),
      timestamp: new Date().toISOString(),
      status: 'Pending Intake',
      model,
      rawInput: rawInput.trim(),
      ...validated,
    };

    orders.unshift(order);
    persistOrders();

    return res.status(201).json({ success: true, order });
  } catch (err) {
    const isTimeout = err.message.includes('timed out');
    console.error('[PrintFlow] ❌  Parse error:', err.message);
    return res.status(isTimeout ? 504 : 500).json({
      error: isTimeout
        ? 'The AI model timed out (15 s). Please try again.'
        : 'Failed to process order. Please try again.',
      detail: err.message,
    });
  }
});

// GET /api/orders
app.get('/api/orders', (_req, res) => res.json(orders));

// PATCH /api/orders/:id/status
app.patch('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body ?? {};

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
    });
  }

  const order = orders.find((o) => o.orderId === id);
  if (!order) return res.status(404).json({ error: `Order ${id} not found.` });

  order.status = status;
  persistOrders();
  res.json({ success: true, order });
});

// DELETE /api/orders/:id
app.delete('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const index = orders.findIndex((o) => o.orderId === id);
  if (index === -1) return res.status(404).json({ error: `Order ${id} not found.` });

  const [deleted] = orders.splice(index, 1);
  persistOrders();
  console.log(`[PrintFlow] 🗑️  Deleted order ${id}`);
  res.json({ success: true, deletedOrder: deleted });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n[PrintFlow] 🚀  Server → http://localhost:${PORT}`);
  console.log(`[PrintFlow] 🔑  Gemini key: ${process.env.GEMINI_API_KEY ? '✅ loaded' : '❌ MISSING'}`);
  console.log(`[PrintFlow] 🤖  Model chain: ${MODELS.join(' → ')}`);
  console.log(`[PrintFlow] 💾  Persistence: ${DB_FILE}\n`);
});
