import { NextRequest, NextResponse } from "next/server";
import { FAQS, RECIPIENTS, WALLET, findRecipients } from "@/lib/db";
import { genJson } from "@/lib/gemini";

export const runtime = "nodejs";

type TangoResp = {
  intent: "faq" | "transfer" | "unknown";
  amount?: number;
  recipientQuery?: string;
  confidence: number;
  riskLevel?: "low" | "medium" | "high";
  needsClarification?: boolean;
  message: string;
};

function mockInterpret(message: string): TangoResp {
  const lower = message.toLowerCase();

  // FAQ match
  const faq = FAQS.find((f) => f.match.some((k) => lower.includes(k)));
  if (faq) {
    return { intent: "faq", confidence: 0.95, message: faq.a };
  }

  // Transfer regex: "pay/send/transfer RM<amount> to <name>"
  const m = lower.match(/(?:pay|send|transfer|bayar)[^\d]*(?:rm)?\s*(\d+(?:\.\d+)?)\s*(?:rm)?\s*(?:to|kepada|ke)\s+([a-z]+)/i);
  if (m) {
    const amount = parseFloat(m[1]);
    const recipientQuery = m[2];
    const matches = findRecipients(recipientQuery);
    return {
      intent: "transfer",
      amount,
      recipientQuery,
      confidence: matches.length === 1 ? 0.92 : 0.78,
      needsClarification: matches.length > 1,
      message:
        matches.length === 0
          ? `I couldn't find anyone matching "${recipientQuery}".`
          : matches.length === 1
          ? `Ready to transfer RM${amount} to ${matches[0].name}.`
          : `I found ${matches.length} possible recipients for "${recipientQuery}". Please choose one.`,
    };
  }

  // Fallback FAQ-ish
  return {
    intent: "unknown",
    confidence: 0.4,
    message:
      "I can help with transfers and wallet FAQs. Try: \"Pay RM50 to Rizwan\" or \"What is my transfer limit?\".",
  };
}

export async function POST(req: NextRequest) {
  const { message } = await req.json().catch(() => ({ message: "" }));
  if (!message || typeof message !== "string") {
    return NextResponse.json({ intent: "unknown", confidence: 0, message: "No message." });
  }

  const schema = `{
  "intent": "faq" | "transfer" | "unknown",
  "amount": number | null,
  "recipientQuery": string | null,
  "confidence": number (0..1),
  "riskLevel": "low"|"medium"|"high"|null,
  "needsClarification": boolean,
  "message": string (short, friendly)
}`;

  const known = RECIPIENTS.map((r) => `- ${r.name}`).join("\n");
  const prompt = `User wallet balance: RM${WALLET.balance}. Daily limit: RM${WALLET.dailyLimit}.
Known recipients:\n${known}\n
Interpret this user message and produce the JSON. If it's a question about limits/balance/security/fees, set intent="faq" and put the direct answer in "message".
If they want to send money, extract amount (in RM) and recipientQuery (first name only is fine).

Message: """${message}"""`;

  const ai = await genJson<TangoResp>(prompt, schema);
  const resp = ai && ai.intent ? ai : mockInterpret(message);
  return NextResponse.json(resp);
}
