"use client";
import { useState } from "react";
import { ArrowLeft, Phone, Smartphone, ShoppingBag, Receipt, Wifi, Headset } from "lucide-react";
import { useApp } from "@/lib/store";
import { fmtRM } from "@/lib/utils";

const SERVICES = [
  { icon: <Headset className="w-6 h-6 text-rose-500" />, label: "SOS Top Up" },
  { icon: <Smartphone className="w-6 h-6 text-violet-500" />, label: "Eastel Top Up" },
  { icon: <Phone className="w-6 h-6 text-sky-500" />, label: "Sell Devices" },
  { icon: <ShoppingBag className="w-6 h-6 text-emerald-500" />, label: "Buy Phones" },
  { icon: <Receipt className="w-6 h-6 text-amber-500" />, label: "Postpaid Bills" },
  { icon: <Wifi className="w-6 h-6 text-rose-600" />, label: "Hua Broadband" },
];

const PLANS = [
  { title: "Prepaid Reload", price: 30, days: 30, tag: "Suggested" },
  { title: "Prepaid Reload", price: 35, days: 35 },
  { title: "Giler Unlimited GX43", price: 43, days: 30, tag: "Level Up & Get Cashback", features: ["Unlimited Data 48 Mbps", "Unlimited Hotspot", "Unlimited Calls"] },
];

const FILTERS = ["Suggested", "Internet", "Credit"] as const;

export default function PrepaidScreen() {
  const { setScreen } = useApp();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Suggested");
  const [tab, setTab] = useState<"Top Up" | "Auto Renewal" | "History">("Top Up");
  const [picked, setPicked] = useState<number | null>(null);

  const total = picked !== null ? PLANS[picked].price : 0;

  return (
    <div className="h-full w-full bg-[#f2f4f8] flex flex-col">
      <div className="tng-blue text-white px-4 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen("home")} aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-semibold">MY Prepaid</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-24">
        <div className="bg-white rounded-2xl shadow-sm p-3 mt-3">
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            {SERVICES.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1 min-w-[60px]">
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">{s.icon}</div>
                <span className="text-[10px] text-gray-800 text-center font-medium leading-tight">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-center gap-1">
            <span className="w-4 h-1 rounded bg-tng-blue" />
            <span className="w-2 h-1 rounded bg-gray-300" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm mt-3 p-3">
          <div className="flex gap-4 text-sm border-b border-gray-100">
            {(["Top Up", "Auto Renewal", "History"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-2 ${tab === t ? "font-semibold border-b-2 border-tng-blue text-gray-900" : "text-gray-500"}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="text-orange-500 font-bold">U</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900">Khairol &apos;Izzul Firdaus Bin Khairol Hisam</div>
              <div className="text-tng-blue text-sm font-semibold">+60 16 552 4675</div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full border text-xs font-semibold ${filter === f ? "border-tng-blue text-tng-blue bg-tng-blue/5" : "border-gray-300 text-gray-600"}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-2">
            {PLANS.map((p, i) => (
              <button
                key={i}
                onClick={() => setPicked(i)}
                className={`w-full text-left rounded-xl p-3 bg-white border ${picked === i ? "border-tng-blue ring-2 ring-tng-blue/30" : "border-gray-200"}`}
              >
                {p.tag && (
                  <span className="inline-block text-[10px] font-semibold text-white bg-amber-500 px-2 py-0.5 rounded-t-md rounded-br-md mb-1">
                    {p.tag}
                  </span>
                )}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{p.title}</div>
                    {p.features && (
                      <ul className="mt-1 text-[11px] text-gray-600 list-disc pl-4">
                        {p.features.map((f) => <li key={f}>{f}</li>)}
                      </ul>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{fmtRM(p.price)}</div>
                    <div className="mt-1 text-[10px] bg-tng-sky text-tng-blue font-semibold px-2 py-0.5 rounded">{p.days} days</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 bg-white border-t border-gray-200 p-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] text-gray-500">Total amount</div>
          <div className="text-tng-blue text-xl font-bold">{fmtRM(total)}</div>
        </div>
        <button
          disabled={picked === null}
          className={`px-8 py-3 rounded-full font-semibold ${picked !== null ? "bg-tng-blue text-white" : "bg-gray-200 text-gray-400"}`}
        >
          Top up
        </button>
      </div>
    </div>
  );
}
