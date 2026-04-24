"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles, X, Send, Paperclip, User, ShieldAlert, ShieldCheck,
  ImagePlus, AlertTriangle, MessageCircle, History as HistoryIcon, Trash2,
  CheckCircle2, MessageSquare, Smartphone,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { RECIPIENTS, Recipient, WHATSAPP_SAMPLES, averageSentTo, findRecipients } from "@/lib/db";
import { fmtRM } from "@/lib/utils";

type Msg =
  | { role: "user" | "ai"; kind: "text"; content: string }
  | { role: "ai"; kind: "recipients"; amount: number; options: Recipient[]; confidence: number; query: string }
  | { role: "ai"; kind: "confirm-transfer"; recipient: Recipient; amount: number; risk: "low" | "medium" | "high"; reasons?: string[] }
  | { role: "ai"; kind: "scam-warning"; sender: string; amount: number; reasons: string[] }
  | { role: "user"; kind: "image"; label: string };

const SUGGESTIONS = [
  "What is my transfer limit?",
  "Pay RM50 to Rizwan",
  "Pay RM500 to Rizwan",
];

export default function TangoAssistant() {
  const { showTango, setShowTango, startTransfer, logAction, actionLog, clearActionLog } = useApp();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "ai",
      kind: "text",
      content:
        "Hi, I'm Tango — your wallet assistant. I can answer FAQs, transfer money, read WhatsApp screenshots, and catch scams. Try a prompt below.",
    },
  ]);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, showTango]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", kind: "text", content: clean }]);
    setBusy(true);
    try {
      const res = await fetch("/api/tango", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean }),
      });
      const data = await res.json();
      handleAi(data);
    } catch (e) {
      setMsgs((m) => [...m, { role: "ai", kind: "text", content: "Sorry, something went wrong. Try again." }]);
    } finally {
      setBusy(false);
    }
  }

  function handleAi(data: any) {
    // intent-based rendering
    if (data.intent === "faq") {
      setMsgs((m) => [...m, { role: "ai", kind: "text", content: data.message }]);
      logAction({ type: "faq", summary: data.message.slice(0, 80), details: { answer: data.message } });
      return;
    }
    if (data.intent === "transfer" && data.recipientQuery) {
      const options: Recipient[] = findRecipients(String(data.recipientQuery));
      if (options.length === 0) {
        setMsgs((m) => [...m, { role: "ai", kind: "text", content: `I couldn't find anyone matching "${data.recipientQuery}".` }]);
        return;
      }
      if (options.length === 1) {
        const r = options[0];
        const avg = averageSentTo(r.id);
        const amt = Number(data.amount) || 0;
        const risk: "low" | "medium" | "high" =
          avg > 0 && amt > avg * 3 ? "high" : avg > 0 && amt > avg * 1.5 ? "medium" : "low";
        setMsgs((m) => [
          ...m,
          {
            role: "ai",
            kind: "confirm-transfer",
            recipient: r,
            amount: amt,
            risk,
            reasons:
              risk !== "low"
                ? [`You usually send around ${fmtRM(avg)} to ${r.name}. ${fmtRM(amt)} is unusually high.`]
                : undefined,
          },
        ]);
        return;
      }
      // multiple — pick list
      setMsgs((m) => [
        ...m,
        {
          role: "ai",
          kind: "text",
          content: `I found ${options.length} possible recipients. Please choose one:`,
        },
        {
          role: "ai",
          kind: "recipients",
          amount: Number(data.amount) || 0,
          options,
          confidence: Number(data.confidence ?? 0.82),
          query: String(data.recipientQuery),
        },
      ]);
      return;
    }
    setMsgs((m) => [...m, { role: "ai", kind: "text", content: data.message || "Got it." }]);
  }

  function pickRecipient(r: Recipient, amount: number) {
    const avg = averageSentTo(r.id);
    const risk: "low" | "medium" | "high" =
      avg > 0 && amount > avg * 3 ? "high" : avg > 0 && amount > avg * 1.5 ? "medium" : "low";
    setMsgs((m) => [
      ...m,
      { role: "user", kind: "text", content: r.name },
      {
        role: "ai",
        kind: "confirm-transfer",
        recipient: r,
        amount,
        risk,
        reasons:
          risk !== "low"
            ? [`You usually send around ${fmtRM(avg)} to ${r.name}. ${fmtRM(amount)} is unusually high.`]
            : undefined,
      },
    ]);
  }

  async function simulateWhatsApp(kind: "normal" | "scam") {
    const label = kind === "normal" ? "Normal WhatsApp screenshot.png" : "Suspicious WhatsApp screenshot.png";
    setMsgs((m) => [...m, { role: "user", kind: "image", label }]);
    logAction({ type: "whatsapp-upload", summary: `Uploaded ${kind} WhatsApp screenshot`, details: { kind } });
    setBusy(true);
    try {
      const res = await fetch("/api/analyze-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample: kind }),
      });
      const data = await res.json();
      if (data.risk === "high") {
        setMsgs((m) => [
          ...m,
          {
            role: "ai",
            kind: "text",
            content: `OCR detected: "${data.ocr}"`,
          },
          {
            role: "ai",
            kind: "scam-warning",
            sender: data.sender,
            amount: data.amount,
            reasons: data.reasons,
          },
        ]);
        logAction({
          type: "scam-blocked",
          summary: `Blocked scam: ${data.sender} asked for ${fmtRM(data.amount)}`,
          details: { reasons: data.reasons, ocr: data.ocr, sender: data.sender, amount: data.amount },
        });
      } else {
        const options = findRecipients(String(data.recipientQuery));
        setMsgs((m) => [
          ...m,
          { role: "ai", kind: "text", content: `OCR detected: "${data.ocr}"` },
          {
            role: "ai",
            kind: "text",
            content: `I detected a request to send ${fmtRM(data.amount)} to ${data.recipientQuery}. Continue?`,
          },
          {
            role: "ai",
            kind: "recipients",
            amount: data.amount,
            options,
            confidence: 0.9,
            query: data.recipientQuery,
          },
        ]);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {showTango && (
        <>
          <motion.div
            className="absolute inset-0 bg-black/30 z-[65]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowTango(false)}
          />
          <motion.div
            className="absolute inset-0 z-[66] flex flex-col bg-white"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
          >
            <div className="tng-blue text-white px-4 pt-10 pb-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Tango</div>
                <div className="text-[11px] text-white/80">Your AI wallet assistant</div>
              </div>
              <button
                onClick={() => setShowHistory(true)}
                aria-label="History"
                className="relative w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"
              >
                <HistoryIcon className="w-4.5 h-4.5" />
                {actionLog.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-yellow-400 text-[9px] text-black font-bold px-1 rounded-full">
                    {actionLog.length}
                  </span>
                )}
              </button>
              <button onClick={() => setShowTango(false)} aria-label="Close" className="ml-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div ref={scroller} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-[#f7f8fb]">
              {msgs.map((m, i) => (
                <Bubble
                  key={i}
                  msg={m}
                  onPick={pickRecipient}
                  onStart={(r, a) => {
                    logAction({
                      type: "transfer",
                      summary: `Started transfer of ${fmtRM(a)} to ${r.name} (via Tango)`,
                      details: { recipientId: r.id, recipientName: r.name, amount: a, source: "tango" },
                    });
                    startTransfer(r, a);
                  }}
                />
              ))}
              {busy && (
                <div className="flex">
                  <div className="chat-bubble-ai px-3 py-2 text-sm flex gap-1">
                    <Dot /><Dot d={0.15} /><Dot d={0.3} />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 bg-white">
              <div className="px-3 pt-2 flex gap-2 overflow-x-auto no-scrollbar">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 bg-gray-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="px-3 pt-2 flex gap-2">
                <button
                  onClick={() => simulateWhatsApp("normal")}
                  className="text-[11px] px-2.5 py-1.5 rounded-full bg-tng-sky text-tng-blue font-semibold flex items-center gap-1"
                >
                  <ImagePlus className="w-3.5 h-3.5" /> Upload WhatsApp
                </button>
                <button
                  onClick={() => simulateWhatsApp("scam")}
                  className="text-[11px] px-2.5 py-1.5 rounded-full bg-rose-100 text-rose-700 font-semibold flex items-center gap-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Upload scam sample
                </button>
              </div>
              <div className="px-3 py-3 flex items-center gap-2">
                <button aria-label="Attach" className="text-gray-400"><Paperclip className="w-5 h-5" /></button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send(input)}
                  placeholder="Ask Tango…"
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none"
                />
                <button
                  onClick={() => send(input)}
                  className="w-9 h-9 rounded-full bg-tng-blue text-white flex items-center justify-center"
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* History drawer */}
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  className="absolute inset-0 z-[80] bg-white flex flex-col"
                  initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 28, stiffness: 300 }}
                >
                  <div className="tng-blue text-white px-4 pt-10 pb-4 flex items-center gap-3">
                    <button onClick={() => setShowHistory(false)} aria-label="Back"><X className="w-5 h-5" /></button>
                    <div className="flex-1">
                      <div className="font-semibold">Activity history</div>
                      <div className="text-[11px] text-white/80">Everything you&apos;ve done with Tango</div>
                    </div>
                    {actionLog.length > 0 && (
                      <button
                        onClick={() => { if (confirm("Clear all history?")) clearActionLog(); }}
                        className="text-xs flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-full"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Clear
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3">
                    {actionLog.length === 0 ? (
                      <div className="mt-16 text-center text-sm text-gray-500">
                        No activity yet. Try a command or upload a WhatsApp screenshot.
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {actionLog.map((a) => <HistoryRow key={a.id} entry={a} />)}
                      </ul>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function HistoryRow({ entry }: { entry: { id: string; ts: number; type: string; summary: string; details?: any } }) {
  const { icon, color } = iconFor(entry.type);
  const when = new Date(entry.ts).toLocaleString("en-MY", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <li className={`rounded-xl border border-gray-100 bg-white p-3 flex items-start gap-3`}>
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-gray-400 uppercase tracking-wide">{entry.type.replace("-", " ")}</div>
        <div className="text-sm text-gray-900 font-medium leading-snug">{entry.summary}</div>
        {entry.details?.reasons && Array.isArray(entry.details.reasons) && (
          <ul className="mt-1 text-[11px] text-rose-700 list-disc pl-4">
            {entry.details.reasons.slice(0, 3).map((r: string, i: number) => <li key={i}>{r}</li>)}
          </ul>
        )}
        <div className="text-[11px] text-gray-400 mt-1">{when}</div>
      </div>
    </li>
  );
}

function iconFor(type: string): { icon: React.ReactNode; color: string } {
  switch (type) {
    case "transfer":         return { icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, color: "bg-emerald-50" };
    case "scam-blocked":     return { icon: <ShieldAlert className="w-5 h-5 text-rose-600" />, color: "bg-rose-50" };
    case "faq":              return { icon: <MessageSquare className="w-5 h-5 text-tng-blue" />, color: "bg-tng-sky/50" };
    case "whatsapp-upload":  return { icon: <ImagePlus className="w-5 h-5 text-violet-600" />, color: "bg-violet-50" };
    case "watch-merchant":   return { icon: <CheckCircle2 className="w-5 h-5 text-amber-600" />, color: "bg-amber-50" };
    case "watch-handoff":    return { icon: <Smartphone className="w-5 h-5 text-tng-blue" />, color: "bg-tng-sky/50" };
    default:                 return { icon: <MessageCircle className="w-5 h-5 text-gray-600" />, color: "bg-gray-50" };
  }
}

function Bubble({
  msg,
  onPick,
  onStart,
}: {
  msg: Msg;
  onPick: (r: Recipient, amount: number) => void;
  onStart: (r: Recipient, amount: number) => void;
}) {
  if (msg.role === "user" && msg.kind === "text") {
    return (
      <div className="flex justify-end">
        <div className="chat-bubble-user px-3.5 py-2 text-sm max-w-[80%]">{msg.content}</div>
      </div>
    );
  }
  if (msg.role === "user" && msg.kind === "image") {
    return (
      <div className="flex justify-end">
        <div className="chat-bubble-user px-3 py-2 text-sm max-w-[80%] flex items-center gap-2">
          <MessageCircle className="w-4 h-4" /> {msg.label}
        </div>
      </div>
    );
  }
  if (msg.kind === "text") {
    return (
      <div className="flex">
        <div className="chat-bubble-ai px-3.5 py-2 text-sm max-w-[85%] whitespace-pre-wrap">{msg.content}</div>
      </div>
    );
  }
  if (msg.kind === "recipients") {
    return (
      <div className="flex">
        <div className="chat-bubble-ai p-3 text-sm max-w-[90%] w-full space-y-2">
          <div className="text-[11px] text-gray-500">
            Intent: transfer · Amount: {fmtRM(msg.amount)} · Query: &quot;{msg.query}&quot; · Confidence {(msg.confidence * 100).toFixed(0)}%
          </div>
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white">
            {msg.options.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => onPick(r, msg.amount)}
                  className="w-full flex items-center gap-3 p-2.5 text-left active:bg-gray-50"
                >
                  <div className="w-8 h-8 rounded-full bg-tng-sky flex items-center justify-center">
                    <User className="w-4 h-4 text-tng-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{r.name}</div>
                    <div className="text-[11px] text-gray-500">{r.phone}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  if (msg.kind === "confirm-transfer") {
    const riskColor =
      msg.risk === "high" ? "bg-rose-50 border-rose-200 text-rose-700"
      : msg.risk === "medium" ? "bg-amber-50 border-amber-200 text-amber-700"
      : "bg-emerald-50 border-emerald-200 text-emerald-700";
    return (
      <div className="flex">
        <div className="chat-bubble-ai p-3 text-sm max-w-[90%] w-full space-y-2">
          <div>
            I&apos;m ready to transfer <b>{fmtRM(msg.amount)}</b> to <b>{msg.recipient.name}</b>.
          </div>
          <div className={`rounded-lg border px-2.5 py-2 text-xs ${riskColor} flex gap-2`}>
            {msg.risk === "low" ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            <div>
              <div className="font-semibold capitalize">Risk: {msg.risk}</div>
              {msg.reasons?.map((r, i) => <div key={i}>• {r}</div>)}
            </div>
          </div>
          <button
            onClick={() => onStart(msg.recipient, msg.amount)}
            className="mt-1 px-3 py-2 rounded-full bg-tng-blue text-white font-semibold text-sm w-full"
          >
            {msg.risk === "low" ? "Continue to transfer" : "I understand, continue"}
          </button>
        </div>
      </div>
    );
  }
  if (msg.kind === "scam-warning") {
    return (
      <div className="flex">
        <div className="chat-bubble-ai p-3 text-sm max-w-[90%] w-full space-y-2 border-rose-200">
          <div className="flex items-center gap-2 text-rose-700 font-semibold">
            <ShieldAlert className="w-5 h-5" /> Warning: This message may be a scam.
          </div>
          <div className="text-xs text-gray-700">
            From: <b>{msg.sender}</b> · Requested: <b>{fmtRM(msg.amount)}</b>
          </div>
          <ul className="text-xs text-gray-700 bg-rose-50 border border-rose-100 rounded-lg p-2 space-y-1">
            {msg.reasons.map((r, i) => <li key={i}>• {r}</li>)}
          </ul>
          <div className="text-xs text-gray-700 font-medium">
            Recommendation: Do not transfer until you verify with the person through another trusted channel.
          </div>
          <div className="text-[11px] text-gray-400">
            Transfer is blocked. Override is disabled in this demo to protect the user.
          </div>
        </div>
      </div>
    );
  }
  return null;
}

function Dot({ d = 0 }: { d?: number }) {
  return (
    <motion.span
      className="w-1.5 h-1.5 rounded-full bg-gray-400"
      animate={{ opacity: [0.2, 1, 0.2] }}
      transition={{ repeat: Infinity, duration: 1, delay: d }}
    />
  );
}
