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

export async function generateText(prompt: string): Promise<string> {
  const model = getClient().getGenerativeModel({ model: MODEL_ID });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function generateJSON<T>(prompt: string): Promise<T> {
  const model = getClient().getGenerativeModel({
    model: MODEL_ID,
    generationConfig: { responseMimeType: "application/json" },
  });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text) as T;
}

export function isAIAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
