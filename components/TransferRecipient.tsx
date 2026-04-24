"use client";
import { useState } from "react";
import { ArrowLeft, ChevronDown, RotateCw, User, Info, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { RECIPIENTS, Recipient, WALLET } from "@/lib/db";
import { fmtRM } from "@/lib/utils";

const TABS = ["Transfer", "Receive", "Money Packet", "Gift"] as const;
const METHODS = ["eWallet", "DuitNow", "Overseas"] as const;

export default function TransferRecipient() {
  const { setScreen, startTransfer, balance } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Transfer");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("eWallet");
  const [q, setQ] = useState("");

  const filtered = q
    ? RECIPIENTS.filter((r) =>
        r.name.toLowerCase().includes(q.toLowerCase()) || r.phone?.replace(/\s/g, "").includes(q.replace(/\s/g, "")),
      )
    : RECIPIENTS;

  const pick = (r: Recipient) => startTransfer(r);

  return (
    <div className="h-full w-full bg-white flex flex-col">
      <div className="tng-blue text-white px-4 pt-10 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen("home")} aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Transfer</h1>
        </div>
        <div className="mt-4 flex items-center justify-between">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => {
                if (t === "Receive") setScreen("receive");
                else setTab(t);
              }}
              className={`text-sm pb-2 ${tab === t ? "font-semibold border-b-2 border-yellow-400" : "text-white/80"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6">
        <div className="mt-4 grid grid-cols-3 gap-2">
          {METHODS.map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`py-2 rounded-lg border text-sm font-semibold ${
                method === m ? "border-tng-blue text-tng-blue" : "border-gray-300 text-gray-500"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 border-b border-gray-200 pb-2">
          <button className="flex items-center gap-1 text-gray-800 font-medium text-sm">
            +60 <ChevronDown className="w-3 h-3" />
          </button>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Enter name or phone number"
            className="flex-1 outline-none text-sm py-2 placeholder:text-gray-400"
          />
          <button aria-label="Refresh contacts"><RotateCw className="w-4 h-4 text-tng-blue" /></button>
        </div>

        <div className="mt-4 bg-tng-sky/40 border border-tng-sky rounded-xl p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-tng-blue mt-0.5 shrink-0" />
          <div className="text-xs text-gray-700 flex-1">
            <div className="font-semibold text-gray-900">Get a Soundbox TransferMate!</div>
            <div>Get instant sound alerts when you receive money.</div>
            <div className="text-tng-blue font-semibold mt-1">Explore now</div>
          </div>
          <button aria-label="Dismiss"><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="font-semibold text-gray-900">Recent</div>
          <button className="text-xs text-tng-blue font-semibold">View All</button>
        </div>
        <ul className="mt-2 divide-y divide-gray-100">
          {filtered.map((r) => (
            <li key={r.id}>
              <button onClick={() => pick(r)} className="w-full flex items-center gap-3 py-3 text-left">
                <div className="w-9 h-9 rounded-full bg-tng-sky flex items-center justify-center">
                  <User className="w-5 h-5 text-tng-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{r.name}</div>
                  {r.phone && <div className="text-xs text-gray-500">{r.phone}</div>}
                </div>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="py-6 text-center text-sm text-gray-500">No matching recipient</li>
          )}
        </ul>
      </div>

      <div className="bg-gray-50 py-3 text-center text-xs text-gray-600 border-t border-gray-200 flex items-center justify-center gap-1">
        Transferable eWallet balance: {fmtRM(balance)} <Info className="w-3 h-3 text-tng-blue" />
      </div>
    </div>
  );
}
