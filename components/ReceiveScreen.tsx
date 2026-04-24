"use client";
import { ArrowLeft, Download, ChevronUp } from "lucide-react";
import { useApp } from "@/lib/store";

const TABS = ["Transfer", "Receive", "Money Packet", "Gift"] as const;

// Decorative QR mosaic (pure CSS grid). Not a real QR, but looks right for the demo.
function FakeQR() {
  const cells = Array.from({ length: 25 * 25 }, (_, i) => {
    // deterministic pseudo-random so it renders stable
    const x = i % 25, y = Math.floor(i / 25);
    const on = ((x * 73856093) ^ (y * 19349663)) % 5 < 2;
    // finder squares on 3 corners
    const inFinder =
      (x < 7 && y < 7) || (x > 17 && y < 7) || (x < 7 && y > 17);
    return on || inFinder;
  });
  return (
    <div className="grid grid-cols-[repeat(25,1fr)] gap-[1px] w-52 h-52 bg-rose-600 p-2 rounded-xl">
      {cells.map((on, i) => (
        <div key={i} className={on ? "bg-rose-600" : "bg-white"} />
      ))}
    </div>
  );
}

export default function ReceiveScreen() {
  const { setScreen } = useApp();
  return (
    <div className="h-full w-full bg-tng-blue text-white flex flex-col overflow-y-auto no-scrollbar">
      <div className="px-4 pt-10 pb-3 flex items-center gap-3">
        <button onClick={() => setScreen("home")} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Receive</h1>
      </div>
      <div className="px-4 flex items-center justify-between">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => t === "Transfer" && setScreen("transfer-recipient")}
            className={`text-sm pb-2 ${t === "Receive" ? "font-semibold border-b-2 border-yellow-400" : "text-white/80"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mx-4 mt-4 bg-white text-gray-900 rounded-2xl shadow-lg p-5">
        <div className="text-center text-sm text-gray-600">Scan this QR code to transfer to</div>
        <div className="text-center font-bold text-lg leading-tight mt-1">
          KHAIROL &apos;IZZUL FIRDAUS BIN KHAIROL HISAM
        </div>

        <div className="mt-4 flex flex-col items-center">
          <div className="p-2 rounded-xl bg-rose-600">
            <div className="bg-white rounded-lg p-3">
              <FakeQR />
              <div className="text-center text-[10px] font-semibold text-white bg-rose-600 rounded-b-lg py-1 -mx-3 mt-2">
                MALAYSIA NATIONAL QR
              </div>
            </div>
          </div>
        </div>

        <button className="mt-4 w-full py-2.5 rounded-full bg-tng-blue text-white font-semibold flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> Download QR code
        </button>
        <button className="mt-2 w-full py-2.5 rounded-full border border-tng-blue text-tng-blue font-semibold">
          Enter specific amount
        </button>
      </div>

      <div className="mx-4 mt-4 rounded-2xl overflow-hidden bg-white/10 p-4">
        <div className="font-semibold text-white">Get instant sound alerts when you receive money.</div>
        <div className="text-xs text-white/80 mt-1">Activate TransferMate Soundbox for your store.</div>
      </div>

      <div className="mt-auto bg-white text-gray-900 rounded-t-2xl p-3 pt-4 flex items-center justify-center gap-2">
        <div className="w-1.5 h-6 rounded bg-rose-600" />
        <div className="text-sm font-semibold">DuitNow · Account number</div>
        <ChevronUp className="w-4 h-4 ml-2 text-gray-500" />
      </div>
    </div>
  );
}
