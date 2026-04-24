"use client";
import {
  Search, User, Check, Eye, Plus, ChevronRight,
  FileCheck, PieChart, Send, CreditCard, Sparkles,
  Home, ShoppingBag, DollarSign, MapPin, ScanLine,
  Palmtree, Sunrise, Wallet, Fuel, Heart, MapPinned,
  Coins, Building2, MessageSquare, Gift,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { WALLET } from "@/lib/db";
import { fmtRM } from "@/lib/utils";

export default function WalletHome() {
  const { balance, setShowTransferSheet, setShowTango, setScreen } = useApp();
  return (
    <div className="h-full w-full bg-[#f2f4f8] flex flex-col no-scrollbar overflow-y-auto">
      {/* Blue header */}
      <div className="tng-blue text-white px-4 pt-10 pb-5 rounded-b-[26px]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 bg-white/15 rounded-full pl-1 pr-2.5 py-1">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-white relative">
              <div className="absolute inset-0 flex flex-col">
                <div className="flex-1 bg-red-600" /><div className="flex-1 bg-white" />
                <div className="flex-1 bg-red-600" /><div className="flex-1 bg-white" />
                <div className="flex-1 bg-red-600" /><div className="flex-1 bg-white" />
                <div className="flex-1 bg-red-600" />
              </div>
              <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-blue-800 flex items-center justify-center">
                <span className="text-yellow-400 text-[7px] leading-none">★</span>
              </div>
            </div>
            <span className="text-white text-xs font-semibold">MY</span>
            <Palmtree className="w-3 h-3" />
          </div>
          <div className="flex-1 bg-white rounded-full flex items-center px-3 py-1.5">
            <Search className="w-4 h-4 text-gray-400" />
            <span className="ml-2 text-gray-800 text-sm font-medium">Pay Bills</span>
          </div>
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-white/95 flex items-center justify-center">
              <User className="w-5 h-5 text-yellow-500" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0057d9]" />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
          <span className="text-2xl font-bold">{fmtRM(balance)}</span>
          <Eye className="w-5 h-5 ml-1" />
        </div>
        <div className="text-xs text-white/80 mt-0.5 flex items-center gap-1">
          View asset details <ChevronRight className="w-3 h-3" />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button className="px-3 py-1.5 rounded-full border border-white text-sm font-semibold flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add money
          </button>
          <button className="text-sm font-semibold flex items-center gap-1">
            Transactions <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-4 -mt-3">
        <div className="bg-white rounded-2xl shadow-sm grid grid-cols-4 gap-1 py-3 px-2">
          <QuickAction icon={<FileCheck className="w-5 h-5 text-tng-blue" />} label="Apply" />
          <QuickAction icon={<PieChart className="w-5 h-5 text-tng-blue" />} label="Cash flow" />
          <QuickAction
            icon={<Send className="w-5 h-5 text-tng-blue" />}
            label="Transfer"
            onClick={() => setShowTransferSheet(true)}
          />
          <QuickAction icon={<CreditCard className="w-5 h-5 text-tng-blue" />} label="Cards" />
        </div>
      </div>

      {/* Feature cards */}
      <div className="px-4 mt-3 grid grid-cols-2 gap-2.5">
        <Card title="Grow your money" sub="Start with just RM10" icon={<Sunrise className="w-6 h-6 text-emerald-500" />} />
        <Card title="BUDI95" sub="RON95 at RM1.99" icon={<Fuel className="w-6 h-6 text-amber-500" />} />
        <Card title="GOrewards" sub="7,788 pts" icon={<Gift className="w-6 h-6 text-pink-500" />} />
        <Card title="Fuel balance" sub="123 litres" icon={<Fuel className="w-6 h-6 text-blue-500" />} />
      </div>

      <div className="px-4 mt-4">
        <div className="text-sm font-semibold text-gray-900">Recommended</div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          <Shortcut icon={<Palmtree className="w-6 h-6 text-amber-500" />} label="Travel" />
          <Shortcut icon={<Coins className="w-6 h-6 text-yellow-500" />} label="e-Mas" />
          <Shortcut icon={<Wallet className="w-6 h-6 text-emerald-500" />} label="WalletSafe" />
          <Shortcut icon={<Fuel className="w-6 h-6 text-cyan-600" />} label="Petrol" />
        </div>
      </div>

      <div className="px-4 mt-4 mb-28">
        <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          My Favourites <span className="text-tng-blue text-xs font-semibold">Edit</span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          <Shortcut icon={<Heart className="w-6 h-6 text-rose-500" />} label="Donation" onClick={() => setScreen("donation")} />
          <Shortcut icon={<MapPinned className="w-6 h-6 text-orange-500" />} label="Goal City" />
          <Shortcut icon={<DollarSign className="w-6 h-6 text-indigo-500" />} label="CashLoan" onClick={() => setScreen("cashloan")} />
          <Shortcut icon={<Building2 className="w-6 h-6 text-blue-500" />} label="ASNB" />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          <Shortcut icon={<CreditCard className="w-6 h-6 text-rose-500" />} label="MY Prepaid" onClick={() => setScreen("prepaid")} />
          <Shortcut icon={<ShoppingBag className="w-6 h-6 text-amber-500" />} label="My Business" />
          <Shortcut icon={<MapPin className="w-6 h-6 text-emerald-500" />} label="Parking" />
          <Shortcut icon={<MessageSquare className="w-6 h-6 text-orange-500" />} label="Chat" />
        </div>
      </div>

      {/* Tango AI assistant FAB */}
      <button
        onClick={() => setShowTango(true)}
        className="absolute right-4 bottom-24 w-14 h-14 rounded-full bg-gradient-to-br from-tng-blue to-indigo-600 text-white shadow-xl flex items-center justify-center"
        aria-label="Open Tango AI"
      >
        <Sparkles className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 bg-yellow-400 text-[9px] text-black font-bold px-1.5 py-0.5 rounded-full">AI</span>
      </button>

      {/* Bottom nav */}
      <div className="absolute bottom-0 inset-x-0 bg-white border-t border-gray-200 flex items-center justify-between px-6 py-2 pb-3">
        <NavItem icon={<Home className="w-5 h-5" />} label="Home" active />
        <NavItem icon={<ShoppingBag className="w-5 h-5" />} label="Shop" />
        <button
          onClick={() => setScreen("scan")}
          className="w-14 h-14 rounded-full bg-tng-blue text-white shadow-lg flex items-center justify-center -mt-8 border-4 border-white"
          aria-label="Scan"
        >
          <ScanLine className="w-6 h-6" />
        </button>
        <NavItem icon={<DollarSign className="w-5 h-5" />} label="GOfinance" />
        <NavItem icon={<MapPin className="w-5 h-5" />} label="Near Me" />
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 py-1.5 active:bg-gray-50 rounded-lg">
      {icon}
      <span className="text-xs font-medium text-gray-800">{label}</span>
    </button>
  );
}
function Card({ title, sub, icon }: { title: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-3 flex items-center gap-2">
      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">{icon}</div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900 truncate">{title}</div>
        <div className="text-[11px] text-gray-500 truncate">{sub}</div>
      </div>
    </div>
  );
}
function Shortcut({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 active:opacity-70">
      <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">{icon}</div>
      <span className="text-[11px] text-gray-800 font-medium truncate max-w-[64px]">{label}</span>
    </button>
  );
}
function NavItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-0.5 ${active ? "text-tng-blue" : "text-gray-500"}`}>
      {icon}<span className="text-[10px] font-semibold">{label}</span>
    </div>
  );
}
