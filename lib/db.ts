export type Recipient = {
  id: string;
  name: string;
  phone?: string;
  bank?: string;
  avatarColor?: string;
};

export type Transaction = {
  id: string;
  recipientId: string;
  amount: number;
  note: string;
  date: string; // ISO
};

export const WALLET = {
  balance: 1000,
  dailyLimit: 5000,
  currency: "RM",
  user: "Demo User",
};

export const RECIPIENTS: Recipient[] = [
  { id: "r1", name: "Rizwan Hakeem", phone: "+60 10-554 3459", avatarColor: "#3b82f6" },
  { id: "r2", name: "Ridzuan Hakim", phone: "+60 11-821 9981", avatarColor: "#8b5cf6" },
  { id: "r3", name: "Muhammad Rizwan", phone: "+60 12-777 1902", avatarColor: "#10b981" },
  { id: "r4", name: "Syed Mohamad Faiz", phone: "+60 13-410 2233", avatarColor: "#f59e0b" },
  { id: "r5", name: "Nurfazlin", phone: "+60 11-612 1904", avatarColor: "#ec4899" },
  { id: "r6", name: "Rahman Mizanur", phone: "+60 17-233 8812", avatarColor: "#06b6d4" },
];

// Prior behavior used for anomaly detection
export const TRANSACTIONS: Transaction[] = [
  { id: "t1", recipientId: "r1", amount: 50, note: "Dinner", date: "2026-04-10T12:00:00Z" },
  { id: "t2", recipientId: "r1", amount: 45, note: "Lunch", date: "2026-04-15T12:00:00Z" },
  { id: "t3", recipientId: "r1", amount: 60, note: "Grab share", date: "2026-04-20T12:00:00Z" },
  { id: "t4", recipientId: "r4", amount: 20, note: "Kopi", date: "2026-04-18T09:00:00Z" },
  { id: "t5", recipientId: "r5", amount: 150, note: "Gift", date: "2026-04-12T18:00:00Z" },
];

export const FAQS: { q: string; a: string; match: string[] }[] = [
  {
    q: "What is my transfer limit?",
    a: "Your demo transfer limit is RM5,000 per day. For this prototype, the available wallet balance is RM1,000.",
    match: ["limit", "transfer limit", "daily limit", "max"],
  },
  {
    q: "What is my balance?",
    a: "Your Tango Wallet balance is RM1,000. Tap Add money on the home screen to top up.",
    match: ["balance", "how much", "wallet money"],
  },
  {
    q: "Is Tango secure?",
    a: "Tango uses biometric or PIN verification before every transfer in this demo. Real deployments would add 3D Secure, device binding, and risk scoring.",
    match: ["secure", "security", "safe"],
  },
  {
    q: "How do fees work?",
    a: "Local eWallet and DuitNow transfers in this demo are free. Overseas remittance would show an FX fee before confirmation.",
    match: ["fee", "charge", "cost"],
  },
];

export const SCAM_SIGNALS = [
  "urgent payment request",
  "unknown recipient",
  "suspicious wording ('now', 'emergency', 'hurry')",
  "request from unverified contact",
  "unusual amount for this sender",
];

export const MERCHANTS = [
  { id: "m1", name: "Kopi Corner", category: "F&B" },
  { id: "m2", name: "MRT Touch Pay", category: "Transport" },
  { id: "m3", name: "Seven Mart", category: "Retail" },
];

export const WATCH_COMMANDS = [
  { phrase: "Pay merchant RM10", type: "merchant", amount: 10, merchantId: "m1" },
  { phrase: "Transfer RM500 to Rizwan", type: "transfer", amount: 500, recipientQuery: "Rizwan" },
];

// Sample WhatsApp screenshots (simulated OCR)
export const WHATSAPP_SAMPLES = {
  normal: {
    ocr: "Hey! Can you send RM50 to Rizwan for dinner tonight? 🍜",
    sender: "Aina (saved contact)",
    amount: 50,
    recipientQuery: "Rizwan",
    risk: "low" as const,
  },
  scam: {
    ocr: "URGENT!! Mom in hospital. Transfer RM2000 NOW to this account 1234567890. Don't tell anyone. I'll pay back later.",
    sender: "Unknown +60 11-000 0000",
    amount: 2000,
    recipientQuery: "Unknown account",
    risk: "high" as const,
    reasons: [
      "Urgent payment request",
      "Unknown / unverified sender number",
      "Suspicious wording: 'URGENT', 'NOW', 'don't tell anyone'",
      "Unusual amount vs. your normal behavior",
      "Asks to send to a new, unseen account",
    ],
  },
};

// Very light phonetic normaliser so "Ridzuan" / "Rizwan" / "Rezuan" match
// the same bucket in the demo. Not a real Soundex.
export function phoneticKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/dz|zw|z|s/g, "z")
    .replace(/[aeiouy]/g, "")
    .replace(/(.)\1+/g, "$1");
}

export function findRecipients(query: string): Recipient[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const pk = phoneticKey(q);
  const direct = RECIPIENTS.filter(
    (r) => r.name.toLowerCase().includes(q) || r.phone?.includes(q),
  );
  const fuzzy = RECIPIENTS.filter((r) =>
    r.name.toLowerCase().split(/\s+/).some((tok) => phoneticKey(tok).includes(pk) || pk.includes(phoneticKey(tok))),
  );
  // Merge preserving order, no dupes
  const seen = new Set<string>();
  return [...direct, ...fuzzy].filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}

export function averageSentTo(recipientId: string): number {
  const txs = TRANSACTIONS.filter((t) => t.recipientId === recipientId);
  if (!txs.length) return 0;
  return txs.reduce((s, t) => s + t.amount, 0) / txs.length;
}
