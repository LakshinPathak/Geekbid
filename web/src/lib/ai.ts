import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_ID = process.env.AI_MODEL ?? "gemini-2.0-flash";

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
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function generateJSON<T>(prompt: string, systemInstruction?: string): Promise<T> {
  const model = getClient().getGenerativeModel({
    model: MODEL_ID,
    generationConfig: { responseMimeType: "application/json" },
    ...(systemInstruction ? { systemInstruction } : {}),
  });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text) as T;
}

export function isAIAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
