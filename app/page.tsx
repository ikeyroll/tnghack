"use client";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PhoneShell from "@/components/PhoneShell";
import WalletHome from "@/components/WalletHome";
import TransferSheet from "@/components/TransferSheet";
import TransferRecipient from "@/components/TransferRecipient";
import TransferMoney from "@/components/TransferMoney";
import AuthModal from "@/components/AuthModal";
import Processing from "@/components/Processing";
import Receipt from "@/components/Receipt";
import TangoAssistant from "@/components/TangoAssistant";
import WatchSimulator from "@/components/WatchSimulator";
import PrepaidScreen from "@/components/PrepaidScreen";
import DonationScreen from "@/components/DonationScreen";
import CashLoanScreen from "@/components/CashLoanScreen";
import ScanScreen from "@/components/ScanScreen";
import RemoteBridge from "@/components/RemoteBridge";
import { useApp } from "@/lib/store";

export default function Page() {
  const { screen, handoffMessage, setHandoff } = useApp();
  // Collapse the Scan/Pay/Receive sibling screens into one key so switching
  // tabs inside ScanScreen doesn't trigger a slide animation.
  const animKey = screen === "pay" || screen === "receive" ? "scan" : screen;
  useEffect(() => {
    if (handoffMessage) {
      const t = setTimeout(() => setHandoff(undefined), 5000);
      return () => clearTimeout(t);
    }
  }, [handoffMessage, setHandoff]);
  return (
    <main className="min-h-[100dvh] w-full flex items-center justify-center p-4">
      <div className="flex flex-col items-center">
        <div className="hidden md:block text-white/80 text-xs mb-3 font-medium tracking-wide">
          Tango Wallet Assistant · Hackathon Demo
        </div>
        <PhoneShell>
          <AnimatePresence mode="wait">
            <motion.div
              key={animKey}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
              className="h-full w-full absolute inset-0"
            >
              {screen === "home" && <WalletHome />}
              {screen === "transfer-recipient" && <TransferRecipient />}
              {screen === "transfer-money" && <TransferMoney />}
              {screen === "processing" && <Processing />}
              {screen === "receipt" && <Receipt />}
              {screen === "watch" && <WatchSimulator />}
              {screen === "prepaid" && <PrepaidScreen />}
              {screen === "donation" && <DonationScreen />}
              {screen === "cashloan" && <CashLoanScreen />}
              {(screen === "scan" || screen === "pay" || screen === "receive") && (
                <ScanScreen
                  initialTab={screen === "pay" ? "Pay" : screen === "receive" ? "Receive" : "Scan"}
                />
              )}
              {/* AuthModal handles its own visibility at screen==="auth" */}
              {screen === "auth" && <TransferMoney />}
            </motion.div>
          </AnimatePresence>

          <TransferSheet />
          <AuthModal />
          <TangoAssistant />
          <RemoteBridge />

          {/* Handoff banner from watch */}
          <AnimatePresence>
            {handoffMessage && (
              <motion.div
                initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
                className="absolute top-2 inset-x-3 z-[70] bg-tng-blue text-white text-xs px-3 py-2 rounded-xl shadow-lg flex items-center justify-between gap-2"
              >
                <span className="truncate">📱 {handoffMessage}</span>
                <button onClick={() => setHandoff(undefined)} className="opacity-80">✕</button>
              </motion.div>
            )}
          </AnimatePresence>
        </PhoneShell>
        <div className="hidden md:block text-white/40 text-[11px] mt-3">
          Demo only · no real payments · blue theme inspired by MY e-wallet UX
        </div>
      </div>
    </main>
  );
}
