import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDb } from "./mongodb";

const MODEL_ID = process.env.AI_MODEL ?? "gemini-2.0-flash";

// Bounds how long a single Gemini call can hang before we give up — a stalled
// provider response otherwise has no bounded failure mode and would tie up
// the request indefinitely. The SDK aborts the request client-side and
// rejects generateContent() once this elapses.
const AI_REQUEST_TIMEOUT_MS = 15000;

let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!_client) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY not set");
    _client = new GoogleGenerativeAI(key);
  }
  return _client;
}

// systemInstruction carries the app's own static instructions on a channel
// separate from the (partly user-controlled) prompt content — the model
// weighs it more heavily than plain prompt text, so callers should put
// anything that must not be overridden by injected text there instead of
// concatenating it into the prompt string.
export async function generateText(prompt: string, systemInstruction?: string): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: MODEL_ID,
    ...(systemInstruction ? { systemInstruction } : {}),
  });
  const result = await model.generateContent(prompt, { timeout: AI_REQUEST_TIMEOUT_MS });
  return result.response.text();
}

export async function generateJSON<T>(prompt: string, systemInstruction?: string): Promise<T> {
  const model = getClient().getGenerativeModel({
    model: MODEL_ID,
    generationConfig: { responseMimeType: "application/json" },
    ...(systemInstruction ? { systemInstruction } : {}),
  });
  const result = await model.generateContent(prompt, { timeout: AI_REQUEST_TIMEOUT_MS });
  const text = result.response.text();
  return JSON.parse(text) as T;
}

export function isAIAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

// Admin kill-switch: Platform Settings exposes an "AI Features" toggle
// (platform_config.aiEnabled, PATCH /api/admin/config) labeled "Enable AI
// Bid Strategist, Evaluator, Description Writer" — but every AI route was
// only ever calling isAIAvailable(), which just checks that GEMINI_API_KEY
// is set. Flipping the admin toggle off (e.g. during a cost spike or abuse)
// silently did nothing; every AI endpoint kept working. This checks both.
export async function isAIEnabled(): Promise<boolean> {
  if (!isAIAvailable()) return false;
  try {
    const db = await getDb();
    const config = await db.collection("platform_config").findOne({ key: "platform_config" });
    // Unset/missing defaults to enabled, matching GET /api/admin/config's
    // own `aiEnabled: true` default for a config document that doesn't
    // exist yet or predates this field.
    return config?.aiEnabled !== false;
  } catch {
    // Fail open on a DB hiccup — a transient Mongo error here shouldn't take
    // down every AI feature; the routes' own rate limit/quota checks still
    // bound cost right after this.
    return true;
  }
}
