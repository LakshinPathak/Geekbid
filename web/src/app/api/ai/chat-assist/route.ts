import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { generateText, isAIAvailable } from "@/lib/ai";

export async function POST(req: NextRequest) {
  if (!isAIAvailable()) {
    return NextResponse.json({ error: "AI not available" }, { status: 503 });
  }

  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { message, context } = body;

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const systemContext = context ? `Context: ${context}\n` : "";
    const prompt = [
      "You are GeekBid Assistant, a helpful AI on the GeekBid freelance platform.",
      "You help freelancers and clients with: bidding strategy, pricing, profile tips, job descriptions, and platform questions.",
      "Keep responses concise and actionable (under 150 words unless asked for more detail).",
      "",
      systemContext,
      "User: " + message,
    ].join("\n");

    const reply = await generateText(prompt);
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[AI Chat Assist Error]", err);
    return NextResponse.json({ error: "AI chat failed" }, { status: 500 });
  }
}
