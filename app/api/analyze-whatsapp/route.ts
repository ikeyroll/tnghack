import { NextRequest, NextResponse } from "next/server";
import { WHATSAPP_SAMPLES } from "@/lib/db";
import { genJson } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { sample } = await req.json().catch(() => ({ sample: "normal" }));
  const base = sample === "scam" ? WHATSAPP_SAMPLES.scam : WHATSAPP_SAMPLES.normal;

  // Optionally let Gemini embellish the "intent" reasoning
  const prompt = `You are Tango analyzing a WhatsApp screenshot OCR result for scam risk.
OCR text: "${base.ocr}"
Sender: "${base.sender}"
Amount requested: ${base.amount}
Recipient query: ${"recipientQuery" in base ? base.recipientQuery : "Unknown"}

Produce JSON with: {
  "intent": "transfer",
  "amount": number,
  "recipientQuery": string,
  "risk": "low"|"medium"|"high",
  "reasons": string[] (only when risk != low),
  "ocr": string,
  "sender": string,
  "message": string
}`;

  const schema = `strict JSON as described`;
  const ai = await genJson<any>(prompt, schema);

  const fallback = {
    intent: "transfer",
    amount: base.amount,
    recipientQuery: (base as any).recipientQuery ?? "Unknown",
    risk: base.risk,
    reasons: (base as any).reasons ?? undefined,
    ocr: base.ocr,
    sender: base.sender,
    message:
      base.risk === "high"
        ? "This message shows several scam indicators. I won't auto-open a transfer."
        : `I detected a request to send RM${base.amount} to ${(base as any).recipientQuery}. Continue?`,
  };

  const out = ai && ai.risk ? { ...fallback, ...ai } : fallback;
  return NextResponse.json(out);
}
