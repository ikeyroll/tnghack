import { NextRequest, NextResponse } from "next/server";
import { FAQS, RECIPIENTS, WALLET, findRecipients } from "@/lib/db";
import { genJson } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 30;

type NavScreen =
  | "home"
  | "prepaid"
  | "donation"
  | "cashloan"
  | "receive"
  | "watch"
  | "transfer-recipient"
  | "scan"
  | "pay";

type TangoResp = {
  intent: "faq" | "transfer" | "navigate" | "unknown";
  amount?: number;
  recipientQuery?: string;
  screen?: NavScreen;
  confidence: number;
  riskLevel?: "low" | "medium" | "high";
  needsClarification?: boolean;
  message: string;
};

const NAV_KEYWORDS: { screen: NavScreen; match: string[]; label: string }[] = [
  { screen: "prepaid",            match: ["prepaid", "top up", "topup", "reload", "my prepaid"], label: "MY Prepaid" },
  { screen: "donation",           match: ["donation", "donate", "charity", "zakat"],              label: "Donation" },
  { screen: "cashloan",           match: ["cash loan", "cashloan", "loan", "pinjaman"],           label: "CashLoan" },
  { screen: "pay",                match: ["pay page", "pay tab", "pay screen", "pay qr", "my pay code", "show pay"], label: "Pay" },
  { screen: "receive",            match: ["receive", "my qr", "receive money", "duitnow qr"],    label: "Receive" },
  { screen: "scan",               match: ["scan", "scanner", "camera", "scan qr"],                label: "Scan" },
  { screen: "watch",              match: ["watch", "smartwatch"],                                 label: "Smartwatch" },
  { screen: "transfer-recipient", match: ["transfer page", "send money", "transfer screen"],     label: "Transfer" },
  { screen: "home",               match: ["home", "main screen", "dashboard"],                    label: "Home" },
];

function detectNavigate(lower: string): { screen: NavScreen; label: string } | null {
  // Must look like a navigation command, not a payment
  const hasNavVerb =
    /\b(open|go to|goto|navigate|show|take me to|bring me to|buka|pergi)\b/.test(lower);
  const hit = NAV_KEYWORDS.find((n) => n.match.some((k) => lower.includes(k)));
  if (!hit) return null;
  // If user said "pay/send/transfer RMxx to <name>" we don't want to hijack as nav
  if (/\b(pay|send|transfer|bayar)\b/.test(lower) && /\d/.test(lower)) return null;
  if (!hasNavVerb && !/\bpage\b/.test(lower)) return null;
  return hit;
}

function parseTransfer(lower: string): { amount: number; recipientQuery: string } | null {
  // Accept: "pay rm50 to rizwan", "send 50 to rizwan hakeem", "transfer RM1,000 to muhammad rizwan",
  // "pay rizwan rm50", "rm50 to rizwan"
  const verb = "(?:pay|send|transfer|bayar|kirim)";
  const amt = "(?:rm)?\\s*([0-9]+(?:[.,][0-9]+)?)\\s*(?:rm|ringgit)?";
  const name = "([a-z][a-z\\s]{1,40}?)";

  const patterns = [
    new RegExp(`${verb}\\s+${amt}\\s+(?:to|kepada|ke)\\s+${name}\\s*$`, "i"),
    new RegExp(`${verb}\\s+${name}\\s+${amt}\\s*$`, "i"),     // pay rizwan rm50
    new RegExp(`${amt}\\s+(?:to|kepada|ke)\\s+${name}\\s*$`, "i"), // rm50 to rizwan
  ];

  for (let i = 0; i < patterns.length; i++) {
    const m = lower.match(patterns[i]);
    if (!m) continue;
    // pattern 1 & 3: [amount, name]; pattern 2: [name, amount]
    const amount = parseFloat((i === 1 ? m[2] : m[1]).replace(",", ""));
    const rq = (i === 1 ? m[1] : m[2]).trim();
    if (!isNaN(amount) && rq) return { amount, recipientQuery: rq };
  }
  return null;
}

function mockInterpret(message: string): TangoResp {
  const lower = message.toLowerCase().trim();

  // Navigation
  const nav = detectNavigate(lower);
  if (nav) {
    return {
      intent: "navigate",
      screen: nav.screen,
      confidence: 0.9,
      message: `Opening ${nav.label}…`,
    };
  }

  // FAQ match
  const faq = FAQS.find((f) => f.match.some((k) => lower.includes(k)));
  if (faq) {
    return { intent: "faq", confidence: 0.95, message: faq.a };
  }

  // Transfer
  const t = parseTransfer(lower);
  if (t) {
    const matches = findRecipients(t.recipientQuery);
    return {
      intent: "transfer",
      amount: t.amount,
      recipientQuery: t.recipientQuery,
      confidence: matches.length === 1 ? 0.92 : 0.78,
      needsClarification: matches.length > 1,
      message:
        matches.length === 0
          ? `I couldn't find anyone matching "${t.recipientQuery}".`
          : matches.length === 1
          ? `Ready to transfer RM${t.amount} to ${matches[0].name}.`
          : `I found ${matches.length} possible recipients for "${t.recipientQuery}". Please choose one.`,
    };
  }

  // Fallback
  return {
    intent: "unknown",
    confidence: 0.4,
    message:
      "I can help with transfers, wallet FAQs, and opening pages. Try: \"Pay RM50 to Rizwan\", \"Open Prepaid\", or \"What is my transfer limit?\".",
  };
}

export async function POST(req: NextRequest) {
  const { message } = await req.json().catch(() => ({ message: "" }));
  if (!message || typeof message !== "string") {
    return NextResponse.json({ intent: "unknown", confidence: 0, message: "No message." });
  }

  const schema = `{
  "intent": "faq" | "transfer" | "navigate" | "unknown",
  "amount": number | null,
  "recipientQuery": string | null,
  "screen": "home"|"prepaid"|"donation"|"cashloan"|"receive"|"watch"|"transfer-recipient"|"scan"|"pay"|null,
  "confidence": number (0..1),
  "riskLevel": "low"|"medium"|"high"|null,
  "needsClarification": boolean,
  "message": string (short, friendly)
}`;

  const known = RECIPIENTS.map((r) => `- ${r.name}`).join("\n");
  const prompt = `You are Tango, a friendly AI assistant inside a Malaysian e-wallet demo.

Context:
- User's current wallet balance: RM${WALLET.balance}
- Daily transfer limit: RM${WALLET.dailyLimit}
- Known saved recipients:
${known}
- Available app pages (for navigate intent):
  * home — main wallet dashboard
  * scan — camera scanner to pay a QR
  * pay — user's own barcode / QR to be scanned by a merchant
  * receive — DuitNow QR code to receive money
  * prepaid — mobile top-up
  * donation — charity / donations
  * cashloan — cash loan
  * watch — the smartwatch simulator
  * transfer-recipient — pick a recipient to transfer to

Interpret the user's message and classify the intent:
- "faq"       -> questions about balance, limits, fees, security. Answer in your own words using the context above. Be natural, concise (1-2 sentences), and helpful.
- "transfer"  -> they want to send/pay money. Extract the amount (RM) and the recipient's name into "recipientQuery".
- "navigate"  -> they want to open/visit a screen. Pick the best matching "screen" from the list above. Write a natural short confirmation for "message" (e.g. "Sure, taking you to the donation page.").
- "unknown"   -> anything else. Give a short helpful suggestion.

Rules:
- "message" must NOT be empty. Vary the wording naturally — don't use the same phrase every time.
- Do not invent recipients that aren't in the list. If the user's recipient doesn't match, still return intent="transfer" with your best guess and the app will search.
- Always return valid JSON matching the schema.

User message: """${message}"""`;

  const ai = await genJson<TangoResp>(prompt, schema);
  const valid = ai && ai.intent && typeof ai.message === "string" && ai.message.trim().length > 0;
  const resp = valid ? ai! : mockInterpret(message);
  return NextResponse.json({ ...resp, source: valid ? "gemini" : "mock" });
}
