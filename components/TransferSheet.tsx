"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Users, QrCode, Wallet, Gift } from "lucide-react";
import { useApp } from "@/lib/store";

export default function TransferSheet() {
  const { showTransferSheet, setShowTransferSheet, setScreen } = useApp();
  return (
    <AnimatePresence>
      {showTransferSheet && (
        <>
          <motion.div
            className="absolute inset-0 bg-black/45 z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowTransferSheet(false)}
          />
          <motion.div
            className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl z-50 p-5 pb-7"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
          >
            <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900">Transfer</h2>
            <div className="mt-3 divide-y divide-gray-100">
              <Row
                icon={<Users className="w-6 h-6 text-tng-blue" />}
                title="Send money"
                sub="via eWallet, DuitNow Transfer or remittance"
                onClick={() => { setShowTransferSheet(false); setScreen("transfer-recipient"); }}
              />
              <Row
                icon={<QrCode className="w-6 h-6 text-tng-blue" />}
                title="Receive money"
                sub="Show your DuitNow QR to receive money"
                onClick={() => { setShowTransferSheet(false); setScreen("receive"); }}
              />
              <Row
                icon={<Wallet className="w-6 h-6 text-tng-blue" />}
                title="Money Packet"
                sub="Share random or fixed amount with anyone"
              />
              <Row
                icon={<Gift className="w-6 h-6 text-tng-blue" />}
                title="Gift"
                sub="Send gift with a custom message"
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({ icon, title, sub, onClick }: { icon: React.ReactNode; title: string; sub: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-3 text-left">
      <div className="w-10 h-10 rounded-lg bg-tng-sky/60 flex items-center justify-center">{icon}</div>
      <div className="flex-1">
        <div className="font-semibold text-gray-900">{title}</div>
        <div className="text-xs text-gray-500">{sub}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </button>
  );
}
