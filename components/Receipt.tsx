"use client";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Share2, Star, Home } from "lucide-react";
import { useApp } from "@/lib/store";
import { fmtRM, nowStr } from "@/lib/utils";

export default function Receipt() {
  const { recipient, amount, note, lastReceiptId, resetToHome, logAction } = useApp();
  const logged = useRef(false);
  useEffect(() => {
    if (!logged.current && recipient && amount) {
      logAction({
        type: "transfer",
        summary: `Sent ${fmtRM(amount)} to ${recipient.name} — ${note}`,
        details: { recipientId: recipient.id, recipientName: recipient.name, amount, note, ref: lastReceiptId, status: "success" },
      });
      logged.current = true;
    }
  }, [recipient, amount, note, lastReceiptId, logAction]);

  return (
    <div className="h-full w-full bg-gradient-to-b from-emerald-50 to-white flex flex-col">
      <div className="px-4 pt-10 flex items-center justify-between">
        <button onClick={resetToHome} aria-label="Home">
          <Home className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-3">
          <button aria-label="Favorite"><Star className="w-5 h-5 text-amber-500" /></button>
          <button aria-label="Share"><Share2 className="w-5 h-5 text-gray-600" /></button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-6">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 180 }}
          className="mt-8"
        >
          <CheckCircle2 className="w-20 h-20 text-emerald-500" />
        </motion.div>
        <div className="mt-3 text-lg font-semibold text-gray-900">Transfer successful</div>
        <div className="mt-4 text-4xl font-bold text-gray-900">{amount ? fmtRM(amount) : "--"}</div>
        <div className="text-sm text-gray-500 mt-1">to {recipient?.name ?? "--"}</div>

        <div className="w-full mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-sm">
          <Row label="Recipient" value={recipient?.name ?? "--"} />
          {recipient?.phone && <Row label="Phone" value={recipient.phone} />}
          <Row label="Amount" value={amount ? fmtRM(amount) : "--"} />
          <Row label="Note" value={note || "-"} />
          <Row label="Date & time" value={nowStr()} />
          <Row label="Reference" value={lastReceiptId ?? "--"} />
          <Row label="Status" value={<span className="text-emerald-600 font-semibold">Successful</span>} />
        </div>
      </div>

      <div className="px-4 pb-5">
        <button
          onClick={resetToHome}
          className="w-full py-3 rounded-full bg-tng-blue text-white font-semibold shadow-md"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-1.5 gap-3">
      <div className="text-gray-500">{label}</div>
      <div className="text-gray-900 text-right font-medium truncate max-w-[60%]">{value}</div>
    </div>
  );
}
