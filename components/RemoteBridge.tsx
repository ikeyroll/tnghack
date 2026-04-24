"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Watch, X, Copy, Check, QrCode, Link as LinkIcon } from "lucide-react";
import { useApp, type Screen } from "@/lib/store";
import { RECIPIENTS, MERCHANTS } from "@/lib/db";
import { fmtRM } from "@/lib/utils";

function generateCode() {
  // 4 uppercase chars, avoiding ambiguous 0/O/1/I
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function RemoteBridge() {
  const {
    pairCode, setPairCode, setScreen, setShowTango, setShowTransferSheet,
    startTransfer, setHandoff, logAction, balance, actionLog,
  } = useApp();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);
  const [lastCmd, setLastCmd] = useState<string>("");
  const esRef = useRef<EventSource | null>(null);

  // Ensure a pair code exists
  useEffect(() => {
    if (!pairCode) setPairCode(generateCode());
  }, [pairCode, setPairCode]);

  // Push balance + notifications to the relay so the paired watch can read them.
  useEffect(() => {
    if (!pairCode) return;
    const notifications = actionLog.slice(0, 10).map((e) => ({
      id: e.id,
      ts: e.ts,
      title: e.summary,
      body:
        e.type === "scam-blocked"
          ? "Scam blocked"
          : e.type === "transfer"
          ? "Transfer"
          : e.type === "watch-merchant"
          ? "Merchant pay"
          : e.type === "watch-handoff"
          ? "Watch handoff"
          : e.type,
    }));
    fetch("/api/remote/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: pairCode, balance, notifications }),
    }).catch(() => {});
  }, [pairCode, balance, actionLog]);

  // Subscribe to SSE
  useEffect(() => {
    if (!pairCode || typeof window === "undefined") return;
    const es = new EventSource(`/api/remote?room=${encodeURIComponent(pairCode)}`);
    esRef.current = es;
    es.addEventListener("hello", () => setConnected(true));
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        handleCommand(data.cmd, data.payload);
      } catch {}
    };
    es.onerror = () => setConnected(false);
    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairCode]);

  function handleCommand(cmd: string, payload: any) {
    setLastCmd(cmd);
    // Brief handoff banner so the user sees something happen
    setHandoff(`Watch command: ${cmd}`);
    logAction({
      type: "watch-handoff",
      summary: `Remote watch → ${cmd}`,
      details: { cmd, payload, source: "remote-watch" },
    });

    // Navigation commands
    const nav: Record<string, Screen> = {
      "open-home": "home",
      "open-scan": "scan",
      "open-pay": "pay",
      "open-prepaid": "prepaid",
      "open-donation": "donation",
      "open-cashloan": "cashloan",
      "open-receive": "receive",
      "open-watch": "watch",
      "open-transfer": "transfer-recipient",
    };
    if (nav[cmd]) {
      setScreen(nav[cmd]);
      return;
    }

    if (cmd === "show-tango") {
      setShowTango(true);
      return;
    }
    if (cmd === "show-transfer-sheet") {
      setShowTransferSheet(true);
      return;
    }

    if (cmd === "pay-rizwan") {
      const amount = Number(payload?.amount) || 50;
      const r = RECIPIENTS.find((x) => x.name.toLowerCase().includes("rizwan")) || RECIPIENTS[0];
      startTransfer(r, amount);
      return;
    }

    if (cmd === "pay-merchant") {
      const amount = Number(payload?.amount) || 10;
      const name = String(payload?.name || MERCHANTS[0].name);
      setHandoff(`Watch paid ${fmtRM(amount)} at ${name}`);
      logAction({
        type: "watch-merchant",
        summary: `Remote watch paid ${fmtRM(amount)} at ${name}`,
        details: { amount, merchant: name, source: "remote-watch" },
      });
      return;
    }
  }

  const remoteUrl =
    typeof window !== "undefined" && pairCode
      ? `${window.location.origin}/remote?room=${pairCode}`
      : "";

  return (
    <>
      {/* Floating watch-pair FAB (opposite side from Tango AI) */}
      <button
        onClick={() => setOpen(true)}
        className="absolute left-4 bottom-24 w-12 h-12 rounded-full bg-white text-tng-blue shadow-xl border border-gray-200 flex items-center justify-center"
        aria-label="Pair watch"
        title="Pair with watch"
      >
        <Watch className="w-5 h-5" />
        <span
          className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
            connected ? "bg-emerald-500" : "bg-gray-300"
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="absolute inset-0 bg-black/40 z-[72]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="absolute inset-x-3 bottom-3 z-[73] bg-white rounded-2xl shadow-2xl p-4"
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-tng-sky flex items-center justify-center">
                  <Watch className="w-5 h-5 text-tng-blue" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Pair your Watch</div>
                  <div className="text-[11px] text-gray-500">
                    Open this URL on another device to control this app from your watch.
                  </div>
                </div>
                <button onClick={() => setOpen(false)} aria-label="Close"><X className="w-5 h-5 text-gray-500" /></button>
              </div>

              <div className="mt-3 grid grid-cols-[auto_1fr] gap-3 items-center">
                <div className="p-2 rounded-lg bg-gray-100">
                  <QrCode className="w-10 h-10 text-gray-700" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">Pair code</div>
                  <div className="text-2xl font-bold tracking-widest text-tng-blue">{pairCode}</div>
                  <div className="text-[11px] mt-1 flex items-center gap-1 text-gray-600">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        connected ? "bg-emerald-500" : "bg-gray-300"
                      }`}
                    />
                    {connected ? "Listening for watch commands" : "Waiting for connection…"}
                    {lastCmd && <span className="ml-2 text-gray-400">· last: {lastCmd}</span>}
                  </div>
                </div>
              </div>

              {remoteUrl && (
                <div className="mt-3 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <LinkIcon className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="text-[11px] text-gray-700 truncate flex-1">{remoteUrl}</div>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(remoteUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      } catch {}
                    }}
                    className="text-xs text-tng-blue font-semibold flex items-center gap-1 shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => { setPairCode(generateCode()); setConnected(false); }}
                  className="flex-1 py-2 rounded-full border border-gray-200 text-gray-700 text-sm font-semibold"
                >
                  Regenerate code
                </button>
                <a
                  href={remoteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 rounded-full bg-tng-blue text-white text-sm font-semibold text-center"
                >
                  Open watch app
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
