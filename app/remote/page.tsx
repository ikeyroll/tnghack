"use client";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Mic, Wifi, WifiOff, ArrowLeft, QrCode as QrIcon, Bell, Wallet, Sparkles,
  Home, ScanLine, CreditCard, Heart, DollarSign, Send,
} from "lucide-react";

type Status = "idle" | "sending" | "ok" | "err";
type View = "idle" | "listening" | "pay" | "balance" | "notifications" | "sent" | "error";

type RoomState = {
  balance: number | null;
  notifications: { id: string; ts: number; title: string; body?: string }[];
  updatedAt: number;
};

// Deterministic QR mosaic (visual only)
function FakeQR({ size = 150, color = "#0057d9" }: { size?: number; color?: string }) {
  const cols = 25;
  const cells = Array.from({ length: cols * cols }, (_, i) => {
    const x = i % cols, y = Math.floor(i / cols);
    const on = ((x * 73856093) ^ (y * 19349663)) % 5 < 2;
    const inFinder = (x < 7 && y < 7) || (x > 17 && y < 7) || (x < 7 && y > 17);
    return on || inFinder;
  });
  return (
    <div
      className="grid gap-[1px] p-1.5 rounded bg-white"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, width: size, height: size }}
    >
      {cells.map((on, i) => (
        <div key={i} style={{ background: on ? color : "#fff" }} />
      ))}
    </div>
  );
}

// Gemini-style 4-point sparkle in gradient colours
function GeminiSpark({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <linearGradient id="gg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="33%" stopColor="#9B72F6" />
          <stop offset="66%" stopColor="#F65F73" />
          <stop offset="100%" stopColor="#FBBC04" />
        </linearGradient>
      </defs>
      <path
        d="M24 2 C 26 14, 34 22, 46 24 C 34 26, 26 34, 24 46 C 22 34, 14 26, 2 24 C 14 22, 22 14, 24 2 Z"
        fill="url(#gg)"
      />
    </svg>
  );
}

/** Classify a phrase into a watch-local view, or a relay command for the phone. */
type Interpreted =
  | { kind: "local"; view: "pay" | "balance" | "notifications"; label: string }
  | { kind: "relay"; cmd: string; payload?: any; label: string }
  | null;

function interpret(raw: string): Interpreted {
  const t = raw.toLowerCase().trim();
  if (!t) return null;

  // Local-on-watch: pay QR
  if (/\b(pay|pay\s+qr|show\s+pay|my\s+(pay|qr)|pay\s+code)\b/.test(t)) {
    return { kind: "local", view: "pay", label: "Pay QR" };
  }
  // Local-on-watch: balance
  if (/\b(balance|how\s+much|check\s+(my\s+)?(balance|money)|wallet)\b/.test(t)) {
    return { kind: "local", view: "balance", label: "Balance" };
  }
  // Local-on-watch: notifications
  if (/\b(notification|notifications|alerts?|recent|history|activity)\b/.test(t)) {
    return { kind: "local", view: "notifications", label: "Notifications" };
  }

  // Relay: navigation
  const navMap: [RegExp, string, string][] = [
    [/\b(open|go to|show)\s+home\b/, "open-home", "Home"],
    [/\b(open|go to|show)\s+scan(ner)?\b/, "open-scan", "Scan"],
    [/\b(open|go to|show)\s+receive\b/, "open-receive", "Receive"],
    [/\b(open|go to|show)\s+prepaid\b|\btop[-\s]?up\b|\breload\b/, "open-prepaid", "Prepaid"],
    [/\b(open|go to|show)\s+(donation|donate|charity)\b/, "open-donation", "Donation"],
    [/\b(open|go to|show)\s+(cash\s*loan|loan)\b/, "open-cashloan", "CashLoan"],
    [/\b(open|go to|show)\s+transfer\b/, "open-transfer", "Transfer"],
    [/\b(tango|assistant|ask\s+ai)\b/, "show-tango", "Tango AI"],
  ];
  for (const [rx, cmd, label] of navMap) {
    if (rx.test(t)) return { kind: "relay", cmd, label };
  }

  // Relay: pay merchant
  const m =
    t.match(/pay\s+(?:rm\s*)?(\d+(?:\.\d+)?)\s+(?:at|to|for)?\s*(kopi corner|seven mart|mrt touch pay)/) ||
    t.match(/pay\s+(kopi corner|seven mart|mrt touch pay)\s+(?:rm\s*)?(\d+(?:\.\d+)?)/);
  if (m) {
    const amtStr = /^[0-9]/.test(m[1]) ? m[1] : m[2];
    const nameStr = /^[0-9]/.test(m[1]) ? m[2] : m[1];
    const amount = parseFloat(amtStr);
    const name = nameStr.replace(/\b\w/g, (c) => c.toUpperCase());
    return { kind: "relay", cmd: "pay-merchant", payload: { amount, name }, label: `Pay RM${amount} @ ${name}` };
  }

  // Relay: pay Rizwan
  const r =
    t.match(/(?:pay|send|transfer)\s+(?:rm\s*)?(\d+(?:\.\d+)?)\s+(?:to\s+)?rizwan/) ||
    t.match(/(?:pay|send|transfer)\s+rizwan\s+(?:rm\s*)?(\d+(?:\.\d+)?)/);
  if (r) {
    const amount = parseFloat(r[1]);
    return { kind: "relay", cmd: "pay-rizwan", payload: { amount }, label: `Pay Rizwan RM${amount}` };
  }

  // Generic "pay RM N" → default merchant on phone
  const p = t.match(/pay\s+(?:rm\s*)?(\d+(?:\.\d+)?)/);
  if (p) {
    const amount = parseFloat(p[1]);
    return { kind: "relay", cmd: "pay-merchant", payload: { amount, name: "Kopi Corner" }, label: `Pay RM${amount}` };
  }

  return null;
}

function Controller() {
  const params = useSearchParams();
  const initialRoom = (params.get("room") || "").toUpperCase();
  const [room, setRoom] = useState(initialRoom);
  const [draft, setDraft] = useState(initialRoom);

  const [view, setView] = useState<View>("idle");
  const [status, setStatus] = useState<Status>("idle");
  const [heard, setHeard] = useState<string>("");
  const [lastLabel, setLastLabel] = useState<string>("");

  const [online, setOnline] = useState(true);
  const [now, setNow] = useState<string>("");
  const [state, setState] = useState<RoomState | null>(null);

  const recogRef = useRef<any>(null);
  const revertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clock
  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
      );
    tick();
    const iv = setInterval(tick, 15_000);
    return () => clearInterval(iv);
  }, []);

  // Online indicator
  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Poll state (balance, notifications) every 3s when paired
  useEffect(() => {
    if (!room) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/remote/state?room=${encodeURIComponent(room)}`);
        const s = (await res.json()) as RoomState;
        if (!cancelled) setState(s);
      } catch {}
    };
    load();
    const iv = setInterval(load, 3_000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [room]);

  // Auto-revert some transient views back to idle
  useEffect(() => {
    if (revertTimerRef.current) clearTimeout(revertTimerRef.current);
    if (view === "sent" || view === "error") {
      revertTimerRef.current = setTimeout(() => setView("idle"), 1600);
    }
  }, [view]);

  const send = useCallback(
    async (cmd: string, payload: any, label: string) => {
      if (!room) return;
      setStatus("sending");
      setLastLabel(label);
      try {
        const res = await fetch("/api/remote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room, cmd, payload }),
        });
        const d = await res.json().catch(() => ({}));
        setStatus(d?.ok ? "ok" : "err");
        setView(d?.ok ? "sent" : "error");
        setTimeout(() => setStatus("idle"), 900);
      } catch {
        setStatus("err");
        setView("error");
      }
    },
    [room],
  );

  const handlePhrase = useCallback(
    (phrase: string) => {
      setHeard(phrase);
      const parsed = interpret(phrase);
      if (!parsed) {
        setView("error");
        setLastLabel("Didn't catch that");
        return;
      }
      setLastLabel(parsed.label);
      if (parsed.kind === "local") {
        setView(parsed.view);
      } else {
        send(parsed.cmd, parsed.payload, parsed.label);
      }
    },
    [send],
  );

  const startMic = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setHeard("Voice not supported");
      setView("error");
      return;
    }
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e: any) => {
      const transcript = e.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) handlePhrase(transcript);
      else setView("idle");
    };
    r.onerror = () => setView("idle");
    r.onend = () => {
      // If nothing happened, go back to idle
      setView((v) => (v === "listening" ? "idle" : v));
    };
    recogRef.current = r;
    setHeard("");
    setView("listening");
    try {
      r.start();
    } catch {
      setView("idle");
    }
  }, [handlePhrase]);

  const stopMic = useCallback(() => {
    try { recogRef.current?.stop?.(); } catch {}
  }, []);

  const statusDot = useMemo(() => {
    if (status === "sending") return "bg-sky-400";
    if (status === "ok") return "bg-emerald-400";
    if (status === "err") return "bg-rose-400";
    return "bg-zinc-600";
  }, [status]);

  // ---------- render ----------
  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center p-4 select-none">
      <div className="hidden md:block text-white/60 text-xs mb-4">
        Tango Watch · voice-first · only Pay / Balance / Notifications run on-watch
      </div>

      {/* Watch body (round) */}
      <div className="relative">
        {/* Side button */}
        <div className="absolute right-[-14px] top-1/2 -translate-y-1/2 w-3 h-14 bg-zinc-700 rounded" />
        <div className="w-[320px] h-[320px] rounded-full border-[10px] border-zinc-900 shadow-2xl relative bg-zinc-950">
          <div className="absolute inset-2 rounded-full bg-black overflow-hidden">
            {/* Top status row */}
            <div className="absolute top-3 inset-x-0 flex items-center justify-center gap-2 text-[10px] text-white/60">
              <span>{now || "--:--"}</span>
              {online ? (
                <Wifi className="w-3 h-3 text-emerald-400" />
              ) : (
                <WifiOff className="w-3 h-3 text-rose-400" />
              )}
              <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
              {room && <span className="text-tng-blue font-bold tracking-wider">{room}</span>}
            </div>

            {!room ? (
              <PairEnter draft={draft} setDraft={setDraft} onPair={() => setRoom(draft.trim())} />
            ) : view === "idle" ? (
              <IdleFace onTap={startMic} />
            ) : view === "listening" ? (
              <ListeningFace heard={heard} onCancel={() => { stopMic(); setView("idle"); }} />
            ) : view === "pay" ? (
              <PayFace onBack={() => setView("idle")} />
            ) : view === "balance" ? (
              <BalanceFace balance={state?.balance ?? null} onBack={() => setView("idle")} />
            ) : view === "notifications" ? (
              <NotificationsFace items={state?.notifications ?? []} onBack={() => setView("idle")} />
            ) : view === "sent" ? (
              <SentFace label={lastLabel} />
            ) : (
              <ErrorFace label={lastLabel || "Not understood"} />
            )}
          </div>
        </div>
      </div>

      {/* Hint below watch */}
      {room && (
        <div className="mt-5 max-w-[340px] text-center text-[11px] text-white/60 leading-relaxed">
          Tap the watch and say <i>&quot;pay&quot;</i>, <i>&quot;balance&quot;</i>, <i>&quot;notifications&quot;</i> — those run on the watch.<br />
          Anything else (e.g. <i>&quot;pay RM10 at Kopi Corner&quot;</i>, <i>&quot;open prepaid&quot;</i>) auto-opens on the paired phone.
        </div>
      )}

      {/* No-voice demo buttons */}
      {room && (
        <div className="mt-3 w-full max-w-[340px]">
          <div className="text-[10px] text-white/50 text-center mb-2">Demo without voice</div>
          {/* On-watch actions */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <DemoBtn icon={<QrIcon className="w-4 h-4" />} label="Pay" onClick={() => setView("pay")} />
            <DemoBtn icon={<Wallet className="w-4 h-4" />} label="Balance" onClick={() => setView("balance")} />
            <DemoBtn icon={<Bell className="w-4 h-4" />} label="Notifications" onClick={() => setView("notifications")} />
          </div>
          {/* Relay to phone */}
          <div className="grid grid-cols-4 gap-1.5">
            <DemoBtnSmall icon={<Send className="w-3.5 h-3.5" />} label="Transfer" onClick={() => send("pay-rizwan", { amount: 50 }, "Pay Rizwan RM50")} />
            <DemoBtnSmall icon={<ScanLine className="w-3.5 h-3.5" />} label="Scan" onClick={() => send("open-scan", null, "Scan")} />
            <DemoBtnSmall icon={<CreditCard className="w-3.5 h-3.5" />} label="Prepaid" onClick={() => send("open-prepaid", null, "Prepaid")} />
            <DemoBtnSmall icon={<Heart className="w-3.5 h-3.5" />} label="Donate" onClick={() => send("open-donation", null, "Donation")} />
            <DemoBtnSmall icon={<DollarSign className="w-3.5 h-3.5" />} label="Loan" onClick={() => send("open-cashloan", null, "CashLoan")} />
            <DemoBtnSmall icon={<Home className="w-3.5 h-3.5" />} label="Home" onClick={() => send("open-home", null, "Home")} />
            <DemoBtnSmall icon={<QrIcon className="w-3.5 h-3.5" />} label="Receive" onClick={() => send("open-receive", null, "Receive")} />
            <DemoBtnSmall icon={<Sparkles className="w-3.5 h-3.5" />} label="Tango" onClick={() => send("show-tango", null, "Tango AI")} />
          </div>
        </div>
      )}

      {room && (
        <button
          onClick={() => { setRoom(""); setDraft(""); }}
          className="mt-3 text-[11px] text-white/40 underline"
        >
          Change pair code
        </button>
      )}
    </div>
  );
}

/* -------- Faces -------- */

function PairEnter({
  draft, setDraft, onPair,
}: { draft: string; setDraft: (s: string) => void; onPair: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="text-[11px] text-white/60">Enter pair code</div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value.toUpperCase().slice(0, 6))}
        placeholder="ABCD"
        className="w-24 text-center bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-1.5 text-xl tracking-widest font-bold outline-none focus:border-tng-blue"
      />
      <button
        onClick={onPair}
        disabled={!draft.trim()}
        className="px-4 py-1.5 rounded-full bg-tng-blue text-white text-xs font-semibold disabled:opacity-40"
      >
        Pair
      </button>
    </div>
  );
}

function IdleFace({ onTap }: { onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-transform"
    >
      <GeminiSpark size={52} />
      <div className="text-white/90 text-sm font-medium tracking-wide">Ask Tango</div>
      <div className="absolute bottom-6 text-[9px] text-white/40">tap to speak</div>
    </button>
  );
}

function ListeningFace({ heard, onCancel }: { heard: string; onCancel: () => void }) {
  return (
    <button
      onClick={onCancel}
      className="absolute inset-0 flex flex-col items-center justify-center gap-3"
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-tng-blue/30 animate-ping" />
        <div className="w-14 h-14 rounded-full bg-tng-blue flex items-center justify-center relative">
          <Mic className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="text-[11px] text-white/70">Listening…</div>
      {heard && <div className="text-[10px] text-white/90 px-6 text-center truncate max-w-full">“{heard}”</div>}
      <div className="absolute bottom-6 text-[9px] text-white/40">tap to cancel</div>
    </button>
  );
}

function FaceHeader({ icon, title, onBack }: { icon: React.ReactNode; title: string; onBack: () => void }) {
  return (
    <div className="absolute top-9 inset-x-0 flex items-center justify-center gap-1 text-[10px] text-white/70">
      <button onClick={onBack} className="absolute left-8" aria-label="Back">
        <ArrowLeft className="w-3.5 h-3.5 text-white/70" />
      </button>
      <span className="text-tng-blue">{icon}</span>
      <span className="font-semibold">{title}</span>
    </div>
  );
}

function PayFace({ onBack }: { onBack: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <FaceHeader icon={<QrIcon className="w-3 h-3" />} title="Pay" onBack={onBack} />
      <div className="p-1.5 rounded-xl bg-tng-blue mt-1">
        <div className="bg-white p-1 rounded-lg">
          <FakeQR size={140} color="#0057d9" />
        </div>
      </div>
      <div className="mt-2 text-[9px] text-white/60">show to merchant</div>
    </div>
  );
}

function BalanceFace({ balance, onBack }: { balance: number | null; onBack: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
      <FaceHeader icon={<Wallet className="w-3 h-3" />} title="Balance" onBack={onBack} />
      <div className="text-[10px] text-white/50">eWallet</div>
      <div className="text-3xl font-bold mt-1 bg-gradient-to-br from-sky-300 to-tng-blue bg-clip-text text-transparent">
        {balance == null ? "—" : `RM${balance.toFixed(2)}`}
      </div>
      <div className="mt-1 text-[9px] text-white/40">live from your phone</div>
    </div>
  );
}

function NotificationsFace({
  items, onBack,
}: { items: { id: string; ts: number; title: string; body?: string }[]; onBack: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col pt-12 pb-5 px-6">
      <FaceHeader icon={<Bell className="w-3 h-3" />} title="Notifications" onBack={onBack} />
      <div className="mt-2 flex-1 overflow-y-auto no-scrollbar space-y-1.5">
        {items.length === 0 && (
          <div className="text-center text-[10px] text-white/40 mt-6">No notifications yet</div>
        )}
        {items.slice(0, 6).map((n) => (
          <div key={n.id} className="bg-zinc-900 border border-white/5 rounded-lg px-2 py-1.5">
            <div className="text-[9px] text-white/50">{n.body || "—"}</div>
            <div className="text-[10px] text-white truncate">{n.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SentFace({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
      <GeminiSpark size={40} />
      <div className="text-[11px] text-white/80">Opening on phone…</div>
      <div className="text-[10px] text-emerald-400/80 truncate max-w-full">{label}</div>
    </div>
  );
}

function ErrorFace({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center px-6">
      <div className="text-rose-400 text-xs">Hmm…</div>
      <div className="text-[10px] text-white/70">{label}</div>
    </div>
  );
}

function DemoBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 py-2 rounded-xl bg-zinc-900 border border-white/10 active:bg-zinc-800 text-white/90"
    >
      <span className="text-tng-blue">{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function DemoBtnSmall({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 py-1.5 rounded-lg bg-zinc-900 border border-white/10 active:bg-zinc-800 text-white/90"
    >
      <span className="text-tng-blue">{icon}</span>
      <span className="text-[9px] font-medium">{label}</span>
    </button>
  );
}

export default function RemotePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-black text-white/60 flex items-center justify-center">
          Loading…
        </div>
      }
    >
      <Controller />
    </Suspense>
  );
}
