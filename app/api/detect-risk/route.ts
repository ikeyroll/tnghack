import { NextRequest, NextResponse } from "next/server";
import { RECIPIENTS, averageSentTo } from "@/lib/db";
import { genJson } from "@/lib/gemini";

export const runtime = "nodejs";

type RiskResp = {
  risk: "low" | "medium" | "high";
  reasons: string[];
  avg: number;
  multiplier: number;
};

function heuristic(recipientId: string, amount: number): RiskResp {
  const avg = averageSentTo(recipientId);
  const reasons: string[] = [];
  let risk: RiskResp["risk"] = "low";
  const mult = avg > 0 ? amount / avg : 1;
  if (avg === 0) {
    reasons.push("No prior transfer history with this recipient.");
    if (amount >= 500) { risk = "medium"; reasons.push("Amount is large for a first transfer."); }
  } else if (mult >= 3) {
    risk = "high";
    reasons.push(`You usually send about RM${avg.toFixed(0)} to this recipient — RM${amount.toFixed(0)} is ${mult.toFixed(1)}x higher.`);
  } else if (mult >= 1.5) {
    risk = "medium";
    reasons.push(`Amount is ${mult.toFixed(1)}x your usual transfer to this recipient.`);
  }
  return { risk, reasons, avg, multiplier: mult };
}

export async function POST(req: NextRequest) {
  const { recipientId, amount } = await req.json().catch(() => ({}));
  const r = RECIPIENTS.find((r) => r.id === recipientId);
  if (!r || typeof amount !== "number") {
    return NextResponse.json({ risk: "low", reasons: [], avg: 0, multiplier: 1 });
  }
  const base = heuristic(recipientId, amount);
  const prompt = `Recipient: ${r.name}. Historical avg sent: RM${base.avg.toFixed(2)}. Current amount: RM${amount}.
Classify risk (low/medium/high) and list short reasons. Return JSON { "risk": "...", "reasons": [...] }.`;
  const ai = await genJson<{ risk: RiskResp["risk"]; reasons: string[] }>(prompt);
  if (ai && ai.risk) return NextResponse.json({ ...base, ...ai });
  return NextResponse.json(base);
}
