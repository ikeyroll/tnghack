"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles, X, Send, Paperclip, User, ShieldAlert, ShieldCheck,
  ImagePlus, AlertTriangle, MessageCircle, History as HistoryIcon, Trash2,
  CheckCircle2, MessageSquare, Smartphone, Mic, MicOff, Volume2, VolumeX,
} from "lucide-react";
import type { Screen } from "@/lib/store";
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
  "Open Prepaid",
  "Go to Donation",
  "Show Cash Loan",
];

export default function TangoAssistant() {
  const { showTango, setShowTango, startTransfer, logAction, actionLog, clearActionLog, setScreen } = useApp();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const recogRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "ai",
      kind: "text",
      content:
        "Hi, I'm Tango — your wallet assistant. I can answer FAQs, transfer money, read media  and screenshots, and catch scams. Try a prompt below.",
    },
  ]);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, showTango]);

  // Stop speech when panel closes
  useEffect(() => {
    if (!showTango && typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
      try { recogRef.current?.stop?.(); } catch {}
      setListening(false);
    }
  }, [showTango]);

  function speak(text: string) {
    if (!voiceOn || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1;
      u.pitch = 1;
      u.lang = "en-US";
      window.speechSynthesis.speak(u);
    } catch {}
  }

  function toggleMic() {
    if (typeof window === "undefined") return;
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setMsgs((m) => [...m, { role: "ai", kind: "text", content: "Voice input isn't supported in this browser. Try Chrome on desktop or Android." }]);
      return;
    }
    if (listening) {
      try { recogRef.current?.stop?.(); } catch {}
      setListening(false);
      return;
    }
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e: any) => {
      const transcript = e.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setInput("");
        send(transcript);
      }
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recogRef.current = r;
    try {
      window.speechSynthesis?.cancel();
      r.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

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
    if (data.intent === "navigate" && data.screen) {
      const allowed: Screen[] = [
        "home", "prepaid", "donation", "cashloan", "receive", "watch", "transfer-recipient", "scan", "pay",
      ];
      const target = allowed.includes(data.screen) ? (data.screen as Screen) : null;
      const msg = data.message || (target ? `Opening ${target}…` : "I can't open that page.");
      setMsgs((m) => [...m, { role: "ai", kind: "text", content: msg }]);
      speak(msg);
      if (target) {
        logAction({ type: "faq", summary: `Navigated to ${target}`, details: { screen: target } });
        setTimeout(() => {
          setShowTango(false);
          setScreen(target);
        }, 500);
      }
      return;
    }
    if (data.intent === "faq") {
      setMsgs((m) => [...m, { role: "ai", kind: "text", content: data.message }]);
      logAction({ type: "faq", summary: data.message.slice(0, 80), details: { answer: data.message } });
      speak(data.message);
      return;
    }
    if (data.intent === "transfer" && data.recipientQuery) {
      const options: Recipient[] = findRecipients(String(data.recipientQuery));
      if (options.length === 0) {
        const msg = `I couldn't find anyone matching "${data.recipientQuery}".`;
        setMsgs((m) => [...m, { role: "ai", kind: "text", content: msg }]);
        speak(msg);
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
        speak(
          risk === "low"
            ? `Ready to transfer RM${amt} to ${r.name}. Please confirm.`
            : `Warning. You usually send much less to ${r.name}. Please review before continuing.`
        );
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
    const fallback = data.message || "Got it.";
    setMsgs((m) => [...m, { role: "ai", kind: "text", content: fallback }]);
    speak(fallback);
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

  function renderAnalysis(data: any) {
    if (!data || typeof data.ocr !== "string") {
      const msg = data?.error || "Sorry, I couldn't analyse that image.";
      setMsgs((m) => [...m, { role: "ai", kind: "text", content: msg }]);
      speak(msg);
      return;
    }
    if (data.risk === "high") {
      setMsgs((m) => [
        ...m,
        { role: "ai", kind: "text", content: `I read: "${data.ocr}"` },
        {
          role: "ai",
          kind: "scam-warning",
          sender: data.sender || "Unknown",
          amount: Number(data.amount) || 0,
          reasons: Array.isArray(data.reasons) && data.reasons.length ? data.reasons : ["Suspicious content detected."],
        },
      ]);
      logAction({
        type: "scam-blocked",
        summary: `Blocked scam: ${data.sender} asked for ${fmtRM(Number(data.amount) || 0)}`,
        details: { reasons: data.reasons, ocr: data.ocr, sender: data.sender, amount: data.amount, source: data.source },
      });
      speak(data.message || `Warning. This looks like a scam. I've blocked the request.`);
      return;
    }
    // low/medium -> offer to continue
    const options = findRecipients(String(data.recipientQuery || ""));
    const amount = Number(data.amount) || 0;
    setMsgs((m) => [
      ...m,
      { role: "ai", kind: "text", content: `I read: "${data.ocr}"` },
      {
        role: "ai",
        kind: "text",
        content:
          data.message ||
          (amount
            ? `Looks like a request to send ${fmtRM(amount)} to ${data.recipientQuery}. Continue?`
            : `I couldn't find a clear payment request in this image.`),
      },
      ...(amount && options.length
        ? [
            {
              role: "ai" as const,
              kind: "recipients" as const,
              amount,
              options,
              confidence: 0.9,
              query: String(data.recipientQuery),
            },
          ]
        : []),
    ]);
    speak(data.message || (amount ? `I found a payment request for RM${amount}.` : `No payment request found.`));
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
      renderAnalysis(data);
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setMsgs((m) => [...m, { role: "ai", kind: "text", content: "Please pick an image file (PNG, JPG, WebP)." }]);
      return;
    }
    // Compress / cap size: Gemini inline data should stay under ~4MB
    if (file.size > 8 * 1024 * 1024) {
      setMsgs((m) => [...m, { role: "ai", kind: "text", content: "That image is too large — try one under 8MB." }]);
      return;
    }
    setMsgs((m) => [...m, { role: "user", kind: "image", label: file.name }]);
    logAction({ type: "whatsapp-upload", summary: `Uploaded ${file.name}`, details: { size: file.size, type: file.type } });
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/analyze-image", { method: "POST", body: form });
      const data = await res.json();
      renderAnalysis(data);
    } catch (e) {
      setMsgs((m) => [...m, { role: "ai", kind: "text", content: "Upload failed. Check your connection and try again." }]);
    } finally {
      setBusy(false);
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) uploadImage(f);
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
                onClick={() => {
                  const next = !voiceOn;
                  setVoiceOn(next);
                  if (!next && typeof window !== "undefined") window.speechSynthesis?.cancel();
                }}
                aria-label={voiceOn ? "Mute voice" : "Unmute voice"}
                title={voiceOn ? "Voice replies on" : "Voice replies off"}
                className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"
              >
                {voiceOn ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
              </button>
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
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] px-2.5 py-1.5 rounded-full bg-tng-sky text-tng-blue font-semibold flex items-center gap-1"
                >
                  <ImagePlus className="w-3.5 h-3.5" /> Upload image
                </button>
                <button
                  onClick={() => simulateWhatsApp("scam")}
                  className="text-[11px] px-2.5 py-1.5 rounded-full bg-rose-100 text-rose-700 font-semibold flex items-center gap-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Upload scam sample
                </button>
              </div>
              <div className="px-3 py-3 flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickFile}
                />
                <button
                  aria-label="Attach image"
                  className="text-gray-500"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send(input)}
                  placeholder={listening ? "Listening…" : "Ask Tango…"}
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none"
                />
                <button
                  onClick={toggleMic}
                  aria-label={listening ? "Stop listening" : "Voice input"}
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    listening ? "bg-rose-500 text-white animate-pulse" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
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
