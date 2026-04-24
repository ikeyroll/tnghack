"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { useApp } from "@/lib/store";

export default function Processing() {
  const { completeProcessing } = useApp();
  useEffect(() => {
    const t = setTimeout(() => completeProcessing(), 2200);
    return () => clearTimeout(t);
  }, [completeProcessing]);

  return (
    <div className="h-full w-full bg-gradient-to-b from-sky-100 to-white flex flex-col items-center">
      <div className="mt-28 relative flex flex-col items-center">
        <motion.div
          className="w-28 h-28 rounded-full bg-tng-blue/10 flex items-center justify-center"
          animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}
        >
          <motion.div
            className="w-20 h-20 rounded-full bg-tng-blue/20 flex items-center justify-center"
            animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          >
            <div className="w-14 h-14 rounded-full bg-tng-blue flex items-center justify-center shadow-xl">
              <Send className="w-7 h-7 text-white" />
            </div>
          </motion.div>
        </motion.div>

        <div className="mt-8 text-xl font-semibold text-gray-900">Transferring your money safely...</div>
        <div className="mt-2 text-xs text-gray-500">Tango is verifying the recipient and securing the channel.</div>

        <div className="mt-10 flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-tng-blue"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
