"use client";
import { useState } from "react";
import { ArrowLeft, MoreVertical, Info, Calendar, Percent, Coins, HandCoins } from "lucide-react";
import { useApp } from "@/lib/store";
import { fmtRM } from "@/lib/utils";

const DURATIONS = ["1 year", "2 years", "3 years", "5 years"];
const EMPLOYMENT = ["Salaried", "Business owner (SSM)", "Self-employed", "Freelancer"];

export default function CashLoanScreen() {
  const { setScreen } = useApp();
  const [amount, setAmount] = useState(1000);
  const [duration, setDuration] = useState("2 years");
  const [income, setIncome] = useState(1400);
  const [employment, setEmployment] = useState("Business owner (SSM)");
  const [agree, setAgree] = useState(false);

  return (
    <div className="h-full w-full bg-white flex flex-col">
      <div className="tng-blue text-white px-4 pt-10 pb-4 flex items-center gap-3">
        <button onClick={() => setScreen("home")} aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-semibold flex-1">Financing</h1>
        <MoreVertical className="w-5 h-5" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <div className="bg-gradient-to-r from-amber-200 via-amber-300 to-yellow-200 px-4 pt-4 pb-6 flex items-start gap-3">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
            <HandCoins className="w-7 h-7 text-amber-700" />
          </div>
          <div className="text-gray-900 text-sm">
            Need extra cash? Personalise your offer with{" "}
            <span className="text-rose-500 font-bold">CashLoan</span>
          </div>
        </div>

        <div className="mx-4 -mt-6 bg-white rounded-2xl shadow-lg p-4 space-y-4">
          <Field label="Financing amount">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Math.max(100, Math.min(150000, Number(e.target.value) || 0)))}
              className="text-right font-semibold outline-none w-24"
            />
          </Field>
          <Field label="Financing duration">
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="text-right font-semibold outline-none bg-transparent"
            >
              {DURATIONS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label={<span className="flex items-center gap-1">Monthly income <Info className="w-3 h-3 text-tng-blue" /></span>}>
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(Math.max(0, Number(e.target.value) || 0))}
              className="text-right font-semibold outline-none w-24"
            />
          </Field>
          <Field label="Employment type">
            <select
              value={employment}
              onChange={(e) => setEmployment(e.target.value)}
              className="text-right font-semibold outline-none bg-transparent"
            >
              {EMPLOYMENT.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>

          <label className="flex items-start gap-2 pt-1">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
            <span className="text-xs text-gray-700">
              I agree to the <span className="text-tng-blue font-semibold">CashLoan Terms and Conditions</span>.
            </span>
          </label>

          <button
            disabled={!agree}
            className={`w-full py-3 rounded-full font-semibold ${agree ? "bg-tng-blue text-white" : "bg-gray-200 text-gray-400"}`}
          >
            Calculate now
          </button>
        </div>

        <div className="px-4 mt-6">
          <h3 className="font-semibold text-gray-900">What we offer</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Offer icon={<Coins className="w-6 h-6 text-amber-500" />} title="Financing amount" value={`${fmtRM(100).replace(".00", "")} to RM150,000`} />
            <Offer icon={<Calendar className="w-6 h-6 text-tng-blue" />} title="Financing duration" value="6 months to 5 years" />
            <Offer icon={<Percent className="w-6 h-6 text-emerald-500" />} title="Profit rate" value="From 8.88% p.a." />
            <Offer icon={<Info className="w-6 h-6 text-rose-500" />} title="Eligibility" value="Min. age 21, MY citizen" />
          </div>
          <div className="text-[11px] text-gray-400 text-center mt-4">Demo only — no real financing product.</div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 bg-white border-t border-gray-200 grid grid-cols-2 py-2">
        <div className="flex flex-col items-center text-tng-blue">
          <HandCoins className="w-5 h-5" />
          <span className="text-[11px] font-semibold">Submit now</span>
        </div>
        <div className="flex flex-col items-center text-gray-400">
          <Calendar className="w-5 h-5" />
          <span className="text-[11px] font-semibold">My applications</span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="flex items-center gap-1 text-gray-900">{children}</div>
    </div>
  );
}
function Offer({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3">
      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">{icon}</div>
      <div className="mt-2 text-[11px] text-gray-500">{title}</div>
      <div className="text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}
