"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanFace, Fingerprint, KeyRound, X, ShieldCheck } from "lucide-react";
import { useApp } from "@/lib/store";
import { fmtRM } from "@/lib/utils";

type Mode = "choose" | "face" | "fingerprint" | "pin";

export default function AuthModal() {
  const { screen, setScreen, recipient, amount, authenticate } = useApp();
  const [mode, setMode] = useState<Mode>("choose");
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (screen === "auth") {
      setMode("choose");
      setPin("");
    }
  }, [screen]);

  const proceed = async () => {
    await authenticate();
  };

  // auto-verify face / fingerprint
  useEffect(() => {
    if (mode === "face" || mode === "fingerprint") {
      const t = setTimeout(() => {
        proceed();
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [mode]);

  useEffect(() => {
    if (pin.length === 6) {
      const t = setTimeout(proceed, 300);
      return () => clearTimeout(t);
    }
  }, [pin]);

  return (
    <AnimatePresence>
      {screen === "auth" && (
        <>
          <motion.div
            className="absolute inset-0 bg-black/55 z-[60]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setScreen("transfer-money")}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl z-[61] p-5 pb-7"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-tng-blue" />
                <h3 className="font-bold text-gray-900">Verify to pay</h3>
              </div>
              <button onClick={() => setScreen("transfer-money")} aria-label="Close">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Sending <span className="font-semibold text-gray-900">{amount ? fmtRM(amount) : ""}</span>
              {recipient ? <> to <span className="font-semibold">{recipient.name}</span></> : null}
            </div>

            {mode === "choose" && (
              <div className="mt-5 space-y-3">
                <AuthOption icon={<ScanFace className="w-6 h-6 text-tng-blue" />} label="Face ID" onClick={() => setMode("face")} />
                <AuthOption icon={<Fingerprint className="w-6 h-6 text-tng-blue" />} label="Fingerprint" onClick={() => setMode("fingerprint")} />
                <AuthOption icon={<KeyRound className="w-6 h-6 text-tng-blue" />} label="Enter PIN" onClick={() => setMode("pin")} />
                <div className="text-[11px] text-gray-400 text-center mt-2">Demo only. No real biometrics used.</div>
              </div>
            )}

            {(mode === "face" || mode === "fingerprint") && (
              <div className="mt-6 flex flex-col items-center py-6">
                <motion.div
                  className="w-24 h-24 rounded-full bg-tng-sky flex items-center justify-center"
                  animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
                >
                  {mode === "face" ? <ScanFace className="w-10 h-10 text-tng-blue" /> : <Fingerprint className="w-10 h-10 text-tng-blue" />}
                </motion.div>
                <div className="mt-4 text-sm text-gray-600">
                  {mode === "face" ? "Scanning your face…" : "Place your finger…"}
                </div>
              </div>
            )}

            {mode === "pin" && (
              <div className="mt-5">
                <div className="text-sm text-gray-600 text-center">Enter your 6-digit PIN</div>
                <div className="mt-3 flex justify-center gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full border-2 ${i < pin.length ? "bg-tng-blue border-tng-blue" : "border-gray-300"}`}
                    />
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <button
                      key={n}
                      onClick={() => pin.length < 6 && setPin(pin + String(n))}
                      className="py-3 rounded-xl bg-gray-100 text-lg font-semibold"
                    >
                      {n}
                    </button>
                  ))}
                  <div />
                  <button onClick={() => pin.length < 6 && setPin(pin + "0")} className="py-3 rounded-xl bg-gray-100 text-lg font-semibold">0</button>
                  <button onClick={() => setPin(pin.slice(0, -1))} className="py-3 rounded-xl bg-gray-50 text-sm">⌫</button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function AuthOption({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-tng-blue active:bg-gray-50"
    >
      <div className="w-10 h-10 rounded-lg bg-tng-sky/60 flex items-center justify-center">{icon}</div>
      <div className="flex-1 text-left font-semibold text-gray-900">{label}</div>
    </button>
  );
}
