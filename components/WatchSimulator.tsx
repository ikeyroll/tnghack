"use client";
/**
 * Smartwatch simulator.
 *
 * NOTE: A real Wear OS implementation would use Kotlin + Jetpack Compose for Wear,
 * with the phone app exposing a deep link (e.g. tango://transfer?to=...&amount=...)
 * and the watch sending a hand-off via the Wearable Data Layer / App Links when
 * secure auth is required. Here we simulate that hand-off by flipping the app's
 * `device` state back to "phone" and jumping directly into the transfer flow.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, ArrowLeft, Check, Smartphone, QrCode } from "lucide-react";
import { useApp } from "@/lib/store";
import { MERCHANTS, RECIPIENTS, WATCH_COMMANDS } from "@/lib/db";
import { fmtRM } from "@/lib/utils";

type Stage = "idle" | "listening" | "merchant" | "merchant-success" | "handoff";

export default function WatchSimulator() {
  const { setScreen, startTransfer, setDevice, setHandoff, logAction } = useApp();
  const [stage, setStage] = useState<Stage>("idle");
  const [heard, setHeard] = useState<string>("");
  const [merchantAmount, setMerchantAmount] = useState(10);
  const [merchantName, setMerchantName] = useState("Kopi Corner");

  const runCommand = (phrase: string) => {
    setHeard(phrase);
    setStage("listening");
    setTimeout(() => {
      const cmd = WATCH_COMMANDS.find((c) => c.phrase === phrase);
      if (cmd?.type === "merchant") {
        const m = MERCHANTS.find((m) => m.id === cmd.merchantId);
        setMerchantName(m?.name ?? "Merchant");
        setMerchantAmount(cmd.amount);
        setStage("merchant");
        setTimeout(() => {
          setStage("merchant-success");
          logAction({
            type: "watch-merchant",
            summary: `Paid ${fmtRM(cmd.amount)} at ${m?.name ?? "merchant"} via watch`,
            details: { amount: cmd.amount, merchant: m?.name, source: "watch" },
          });
        }, 1800);
      } else if (cmd?.type === "transfer") {
        setStage("handoff");
        setTimeout(() => {
          // phone handoff: open Transfer Money page with prefilled values
          const r = RECIPIENTS.find((r) => r.name.toLowerCase().includes(cmd.recipientQuery!.toLowerCase()));
          if (r) {
            setDevice("phone");
            setHandoff("Secure action received from your watch. Please authenticate to continue.");
            logAction({
              type: "watch-handoff",
              summary: `Watch requested secure transfer of ${fmtRM(cmd.amount)} to ${r.name} — continuing on phone`,
              details: { amount: cmd.amount, recipientName: r.name, source: "watch" },
            });
            startTransfer(r, cmd.amount);
          }
        }, 1800);
      }
    }, 900);
  };

  return (
    <div className="h-full w-full bg-gradient-to-b from-[#0b1220] via-[#0f172a] to-[#111827] flex flex-col text-white">
      <div className="px-4 pt-10 pb-3 flex items-center gap-3">
        <button onClick={() => setScreen("home")} aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
        <div className="font-semibold">Tango Watch Simulator</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <div className="relative">
          {/* Watch body */}
          <div className="watch-ring w-[260px] h-[260px] rounded-[60px] border-[10px] border-zinc-900 shadow-2xl relative overflow-hidden">
            {/* Side button */}
            <div className="absolute right-[-14px] top-1/2 -translate-y-1/2 w-3 h-10 bg-zinc-700 rounded" />
            <div className="absolute inset-3 rounded-[46px] bg-black flex items-center justify-center">
              <AnimatePresence mode="wait">
                {stage === "idle" && (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center px-3">
                    <div className="text-[11px] text-white/60">Tap to speak</div>
                    <div className="mt-2 text-base font-semibold">Hey Tango</div>
                    <div className="mt-3 w-12 h-12 rounded-full bg-tng-blue/20 border border-tng-blue flex items-center justify-center mx-auto">
                      <Mic className="w-5 h-5 text-tng-blue" />
                    </div>
                  </motion.div>
                )}
                {stage === "listening" && (
                  <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center px-3">
                    <motion.div
                      className="w-12 h-12 rounded-full bg-tng-blue flex items-center justify-center mx-auto"
                      animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}
                    >
                      <Mic className="w-5 h-5 text-white" />
                    </motion.div>
                    <div className="mt-3 text-xs text-white/70">Listening…</div>
                    <div className="mt-1 text-sm">&quot;{heard}&quot;</div>
                  </motion.div>
                )}
                {stage === "merchant" && (
                  <motion.div key="merchant" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center px-3">
                    <div className="text-[11px] text-white/60">Merchant detected</div>
                    <div className="mt-1 font-semibold text-base">{merchantName}</div>
                    <div className="mt-2 text-2xl font-bold">{fmtRM(merchantAmount)}</div>
                    <div className="mt-2 w-14 h-14 mx-auto rounded-lg bg-white flex items-center justify-center">
                      <QrCode className="w-10 h-10 text-black" />
                    </div>
                    <div className="mt-1 text-[10px] text-white/60">Confirming…</div>
                  </motion.div>
                )}
                {stage === "merchant-success" && (
                  <motion.div key="done" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center px-3">
                    <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mx-auto">
                      <Check className="w-7 h-7 text-white" strokeWidth={3} />
                    </div>
                    <div className="mt-2 font-semibold">Paid</div>
                    <div className="text-xs text-white/70">{fmtRM(merchantAmount)} · {merchantName}</div>
                  </motion.div>
                )}
                {stage === "handoff" && (
                  <motion.div key="handoff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center px-3">
                    <Smartphone className="w-10 h-10 text-tng-blue mx-auto" />
                    <div className="mt-2 font-semibold text-sm">Secure auth required</div>
                    <div className="mt-1 text-[11px] text-white/70 leading-snug">Please continue on your phone.</div>
                    <motion.div
                      className="mt-3 h-1 bg-tng-blue/30 rounded overflow-hidden"
                      initial={{ width: 0 }} animate={{ width: "80%" }} transition={{ duration: 1.5 }}
                    >
                      <motion.div className="h-full bg-tng-blue" animate={{ x: ["-100%", "100%"] }} transition={{ repeat: Infinity, duration: 1 }} />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="w-full max-w-[320px] space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-white/50">Try a voice command</div>
          {WATCH_COMMANDS.map((c) => (
            <button
              key={c.phrase}
              onClick={() => runCommand(c.phrase)}
              disabled={stage !== "idle" && stage !== "merchant-success"}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-left px-3 text-sm font-medium disabled:opacity-50"
            >
              <span className="text-white/60 mr-2">&quot;</span>{c.phrase}<span className="text-white/60 ml-1">&quot;</span>
            </button>
          ))}
          {stage === "merchant-success" && (
            <button
              onClick={() => setStage("idle")}
              className="w-full mt-2 py-2 rounded-xl bg-tng-blue text-white text-sm font-semibold"
            >
              Done
            </button>
          )}
        </div>

        <div className="text-[10px] text-white/40 max-w-[320px] text-center leading-snug">
          Simulation only. A production watch app would use Wear OS (Kotlin + Jetpack Compose) and hand off secure
          transfers to the phone via deep links and the Wearable Data Layer.
        </div>
      </div>
    </div>
  );
}
