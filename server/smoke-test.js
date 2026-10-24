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

const MODELS = ['gemini-3.8-flash', 'gemma-4-26b-a4b-it'];

async function smokeTest() {
  console.log('\n📋  PrintFlow AI — Smoke Test\n');

  // 1. List available models
  console.log('1️⃣   Listing available models...');
  try {
    const list = await ai.models.list();
    const names = [];
    for await (const m of list) names.push(m.name);
    console.log(`   Found ${names.length} models.`);
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
        contents: 'I need 500 business cards. Name is Ahmed.',
        config: {
          tools: [{ functionDeclarations: [TOOL] }],
          toolConfig: {
            functionCallingConfig: {
              mode: 'ANY',
              allowedFunctionNames: ['extract_printing_order'],
            },
          },
        },
      });

      const fnCall = response.functionCalls?.[0] ?? response.candidates?.[0]?.content?.parts?.find((p) => p.functionCall)?.functionCall;

      if (fnCall?.args) {
        console.log(`   ✅  ${model} — function call OK!`);
        console.log(`   Args:`, JSON.stringify(fnCall.args, null, 4));
        break;
      } else {
        console.log(`   ⚠️  ${model} — responded without function call.`);
      }
    } catch (e) {
      console.error(`   ❌  ${model} failed:`, e.message);
    }
  }

  console.log('\n✅  Smoke test complete.\n');
}

smokeTest();
