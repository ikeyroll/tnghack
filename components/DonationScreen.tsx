"use client";
import { ArrowLeft, ArrowRight, Heart, Users, HandHeart, Share2 } from "lucide-react";
import { useApp } from "@/lib/store";

const CAUSES = [
  { title: "Flood Relief — Kelantan", raised: 128_500, goal: 250_000, icon: <HandHeart className="w-5 h-5 text-blue-600" /> },
  { title: "Food Aid — B40 Families", raised: 48_200, goal: 100_000, icon: <Users className="w-5 h-5 text-emerald-600" /> },
  { title: "Animal Shelter", raised: 12_100, goal: 30_000, icon: <Heart className="w-5 h-5 text-rose-500" /> },
];

export default function DonationScreen() {
  const { setScreen } = useApp();
  return (
    <div className="h-full w-full bg-white flex flex-col">
      <div className="tng-blue text-white px-4 pt-10 pb-4 flex items-center gap-3">
        <button onClick={() => setScreen("home")} aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-semibold">Donation</h1>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-5 pt-5">
          <div className="h-1 w-10 bg-amber-400 rounded" />
          <h2 className="mt-3 text-2xl font-extrabold leading-tight text-gray-900">
            Support Disaster Relief Efforts in Malaysia
          </h2>
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">
            Your donation will provide essential aid and help communities recover from crises and rebuild their lives.
          </p>
          <button className="mt-4 bg-amber-400 text-tng-blue font-semibold text-sm px-4 py-2 rounded-md flex items-center gap-2">
            Donate now <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mx-5 mt-5 rounded-2xl overflow-hidden aspect-[16/10] bg-gradient-to-br from-sky-200 via-orange-200 to-amber-100 flex items-end justify-center">
          <div className="bg-black/25 text-white text-xs px-3 py-1 m-2 rounded">Flood relief appeal · Malaysia</div>
        </div>

        <div className="px-5 mt-6">
          <h3 className="font-semibold text-gray-900">Share your kindness through</h3>
          <ul className="mt-3 divide-y divide-gray-100 border border-gray-100 rounded-2xl">
            {CAUSES.map((c) => {
              const pct = Math.min(100, Math.round((c.raised / c.goal) * 100));
              return (
                <li key={c.title} className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-tng-sky flex items-center justify-center">{c.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">{c.title}</div>
                    <div className="mt-1 h-1.5 rounded bg-gray-100 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: pct + "%" }} />
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500">
                      RM{c.raised.toLocaleString()} raised of RM{c.goal.toLocaleString()} ({pct}%)
                    </div>
                  </div>
                  <button className="text-tng-blue"><Share2 className="w-4 h-4" /></button>
                </li>
              );
            })}
          </ul>
          <div className="text-[11px] text-gray-400 text-center mt-3">
            Donation screen is a demo only. No real payments are processed.
          </div>
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
