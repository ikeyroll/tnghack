"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, User, ShieldCheck, Gift, Info } from "lucide-react";
import { useApp } from "@/lib/store";
import { fmtRM } from "@/lib/utils";

export default function TransferMoney() {
  const { recipient, amount, setAmount, note, setNote, balance, confirmAmount, setScreen } = useApp();
  const [local, setLocal] = useState(amount ? amount.toFixed(2) : "");

  useEffect(() => {
    setLocal(amount ? amount.toFixed(2) : "");
  }, [amount]);

  const num = parseFloat(local.replace(/[^\d.]/g, ""));
  // Demo: do not gate by wallet balance so AI-prefilled anomaly flow (e.g. RM500) can proceed.
  const valid = !isNaN(num) && num > 0;
  const overBalance = valid && num > balance;

  return (
    <div className="h-full w-full bg-white flex flex-col">
      <div className="tng-blue text-white px-4 pt-10 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen("transfer-recipient")} aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Transfer Money</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4">
        <div className="text-xs text-gray-500 mt-4">Transfer to</div>
        <div className="mt-1 rounded-2xl p-4 bg-gradient-to-br from-amber-50 to-orange-100 border border-amber-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-tng-sky flex items-center justify-center">
            <User className="w-5 h-5 text-tng-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 truncate">
              {recipient ? recipient.name.toUpperCase() : "Select recipient"}
            </div>
            {recipient?.phone && <div className="text-xs text-gray-600">{recipient.phone}</div>}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-gray-700 bg-tng-sky/50 border border-tng-sky rounded-lg px-3 py-2">
          <ShieldCheck className="w-4 h-4 text-tng-blue shrink-0" />
          Always verify recipient name before transferring.
        </div>

        <div className="mt-5">
          <div className="text-xs text-gray-500">Amount</div>
          <div className="flex items-baseline gap-2 border-b border-gray-300 py-2">
            <span className="text-2xl font-semibold text-gray-400">RM</span>
            <input
              autoFocus
              inputMode="decimal"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="0.00"
              className="flex-1 text-3xl font-light outline-none placeholder:text-gray-300"
            />
          </div>
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            You can transfer up to {fmtRM(balance)} <Info className="w-3 h-3 text-tng-blue" />
          </div>
          {overBalance && (
            <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              Demo mode: amount exceeds your wallet balance. The app would normally block this —
              we&apos;ll let it through for the AI anomaly demo.
            </div>
          )}
        </div>

        <button className="mt-3 px-3 py-1.5 rounded-full border border-tng-blue text-tng-blue text-xs font-semibold flex items-center gap-1">
          <Gift className="w-3.5 h-3.5" /> Send gift
        </button>

        <div className="mt-5">
          <div className="text-xs text-gray-500">What&apos;s the transfer for?</div>
          <div className="bg-gray-50 rounded-lg px-3 py-2 mt-1">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 50))}
              className="w-full bg-transparent outline-none text-gray-900"
            />
          </div>
          <div className="text-right text-[10px] text-gray-400">{note.length}/50</div>
        </div>

        <button className="mt-3 px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 text-xs font-semibold">
          Pick a Greeting
        </button>

        <div className="mt-6 rounded-xl overflow-hidden bg-gradient-to-br from-sky-100 to-indigo-100 aspect-[16/9] flex items-center justify-center">
          <div className="text-center px-4">
            <div className="text-sm text-gray-700 font-semibold">Tango Wallet Assistant</div>
            <div className="text-[11px] text-gray-600">Fast. Safe. Smart transfers with AI.</div>
          </div>
        </div>

        <div className="h-24" />
      </div>

      <div className="px-4 pb-4 bg-white border-t border-gray-100 pt-3">
        <button
          disabled={!valid || !recipient}
          onClick={() => {
            setAmount(num);
            confirmAmount();
          }}
          className={`w-full py-3 rounded-full font-semibold ${
            valid && recipient ? "bg-tng-blue text-white shadow-md" : "bg-gray-200 text-gray-400"
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
