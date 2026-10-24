/**
 * smoke-test.js
 * Run BEFORE the main server to verify the Gemma model + function calling works.
 * Usage: node smoke-test.js
 */
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

if (!process.env.GEMINI_API_KEY) {
  console.error('❌  GEMINI_API_KEY missing. Copy .env.example → .env');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const TOOL = {
  name: 'extract_printing_order',
  description: 'Extract structured printing order from customer message.',
  parameters: {
    type: 'object',
    properties: {
      customerName: { type: 'string', description: 'Customer name.' },
      isUrgent: { type: 'boolean', description: 'Is this urgent?' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            productType: { type: 'string' },
            quantity: { type: 'integer' },
          },
          required: ['productType', 'quantity'],
        },
      },
    },
    required: ['customerName', 'items'],
  },
};

const MODELS = ['gemma-4-26b-a4b-it', 'gemma-4-31b-it', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];

async function smokeTest() {
  console.log('\n📋  PrintFlow AI — Smoke Test\n');

  // 1. List available models
  console.log('1️⃣   Listing available models...');
  try {
    const list = await ai.models.list();
    const names = [];
    for await (const m of list) names.push(m.name);
    console.log(`   Found ${names.length} models. Gemma candidates:`);
    names.filter((n) => n.includes('gemma') || n.includes('gemini-2')).forEach((n) => console.log(`   • ${n}`));
  } catch (e) {
    console.error('   ⚠️  Could not list models:', e.message);
  }

  // 2. Try each model with a simple tool call
  console.log('\n2️⃣   Testing function calling...');
  for (const model of MODELS) {
    try {
      console.log(`\n   → Trying ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: 'I need 500 business cards. Name is Ahmed.' }] }],
        tools: [{ functionDeclarations: [TOOL] }],
        toolConfig: { functionCallingConfig: { mode: 'ANY' } },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const fnCall = parts.find((p) => p.functionCall);
      const helperCall = response.functionCalls?.[0];

      if (fnCall?.functionCall?.args) {
        console.log(`   ✅  ${model} — function call OK via candidates.parts`);
        console.log(`   Args:`, JSON.stringify(fnCall.functionCall.args, null, 4));
        break;
      } else if (helperCall?.args) {
        console.log(`   ✅  ${model} — function call OK via response.functionCalls helper`);
        console.log(`   Args:`, JSON.stringify(helperCall.args, null, 4));
        break;
      } else {
        console.log(`   ⚠️  ${model} — responded without function call. Text:`, response.text?.slice(0, 120));
      }
    } catch (e) {
      console.error(`   ❌  ${model} failed:`, e.message);
    }
  }

  console.log('\n✅  Smoke test complete.\n');
}

smokeTest();
