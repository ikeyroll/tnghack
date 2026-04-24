"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Image as ImageIcon, Trash2, Download, CameraOff } from "lucide-react";
import { useApp } from "@/lib/store";
import { fmtRM } from "@/lib/utils";

type Tab = "Scan" | "Pay" | "Receive";

export type ScanInitialTab = Tab;

// Deterministic QR mosaic (not a real QR, just visual)
function FakeQR({ size = 176, color = "black" }: { size?: number; color?: string }) {
  const cols = 25;
  const cells = Array.from({ length: cols * cols }, (_, i) => {
    const x = i % cols, y = Math.floor(i / cols);
    const on = ((x * 73856093) ^ (y * 19349663)) % 5 < 2;
    const inFinder = (x < 7 && y < 7) || (x > 17 && y < 7) || (x < 7 && y > 17);
    return on || inFinder;
  });
  return (
    <div
      className="grid gap-[1px] bg-white p-1.5 rounded"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, width: size, height: size }}
    >
      {cells.map((on, i) => (
        <div key={i} className={on ? "" : "bg-white"} style={{ background: on ? color : "#fff" }} />
      ))}
    </div>
  );
}

function Barcode() {
  // 60 vertical bars with pseudo-random widths
  const bars = Array.from({ length: 60 }, (_, i) => {
    const w = (((i * 2654435761) >>> 0) % 4) + 1; // 1..4 px
    const gap = i % 3 === 0 ? 2 : 1;
    return { w, gap };
  });
  return (
    <div className="flex items-end justify-center h-16 px-2 gap-[2px]">
      {bars.map((b, i) => (
        <div key={i} className="bg-black" style={{ width: b.w, height: "100%" }} />
      ))}
    </div>
  );
}

export default function ScanScreen({ initialTab = "Scan" }: { initialTab?: ScanInitialTab }) {
  const { setScreen, balance } = useApp();
  const [tab, setTab] = useState<Tab>(initialTab);

  // Keep screen key in sync with the active tab so Tango's navigate intent
  // lands on the correct tab and back-navigation stays consistent.
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  return (
    <div className="h-full w-full bg-[#eef1f6] flex flex-col">
      {/* Header */}
      <div className="tng-blue text-white px-4 pt-10 pb-3 flex items-center gap-3">
        <button onClick={() => setScreen("home")} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center font-semibold">
          {tab === "Scan" ? "Scan" : tab === "Pay" ? "Pay" : "Receive"}
        </div>
        <div className="w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {tab === "Scan" && <ScanTab />}
        {tab === "Pay" && <PayTab balance={balance} />}
        {tab === "Receive" && <ReceiveTab />}
      </div>

      {/* Bottom tabs */}
      <div className="bg-white border-t border-gray-200 px-3 py-2">
        <div className="grid grid-cols-3 bg-gray-100 rounded-full p-1 text-sm font-semibold">
          {(["Scan", "Pay", "Receive"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                // Keep the URL/screen in sync so Tango "navigate" and back-nav work.
                setScreen(t === "Scan" ? "scan" : t === "Pay" ? "pay" : "receive");
              }}
              className={`py-2 rounded-full transition-colors ${
                tab === t ? "bg-white text-tng-blue shadow" : "text-gray-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScanTab() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [camState, setCamState] = useState<"loading" | "on" | "denied" | "unsupported">("loading");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCamState("unsupported");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCamState("on");
      } catch {
        setCamState("denied");
      }
    }
    start();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-start px-6 py-6">
      <div className="text-sm mb-3 text-gray-700">Scan Barcode or QR Code</div>
      <div className="relative w-60 h-60 rounded-2xl bg-black flex items-center justify-center overflow-hidden shadow-inner">
        {camState === "on" ? (
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : camState === "loading" ? (
          <div className="text-white/70 text-xs">Starting camera…</div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-white/70 text-xs px-4 text-center">
            <CameraOff className="w-6 h-6 mb-1" />
            {camState === "denied"
              ? "Camera permission denied. Enable it in your browser to scan."
              : "Camera not available on this device."}
          </div>
        )}

        {/* Scan line animation */}
        {camState === "on" && (
          <div className="absolute inset-x-4 top-1/2 h-[2px] bg-tng-blue/80 shadow-[0_0_12px_#0057d9] animate-scanline" />
        )}

        {/* Corner markers */}
        <span className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-tng-blue rounded-tl-lg" />
        <span className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-tng-blue rounded-tr-lg" />
        <span className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-tng-blue rounded-bl-lg" />
        <span className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-tng-blue rounded-br-lg" />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button className="px-4 py-2.5 rounded-full bg-tng-blue text-white text-sm font-semibold flex items-center gap-2">
          <ImageIcon className="w-4 h-4" /> Scan From Gallery
        </button>
        <button className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center" aria-label="Clear">
          <Trash2 className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="mt-8 text-xs text-gray-600 text-center max-w-xs leading-relaxed">
        You can now scan and pay in China, Thailand, Indonesia, and more.
        <div className="text-tng-blue font-semibold mt-1">View all countries</div>
      </div>
    </div>
  );
}

function PayTab({ balance }: { balance: number }) {
  // Refresh hint updates every 60s — cosmetic
  const code = "9480 5858 3058 5033 5999 6799";
  return (
    <div className="px-4 py-4">
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center">
        <Barcode />
        <div className="mt-2 text-sm tracking-[0.18em] text-gray-800 font-medium">{code}</div>

        <div className="relative mt-5">
          <div className="absolute -left-2 top-0 w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-bold flex items-center justify-center">
            2
          </div>
          <div className="p-2 rounded-xl bg-tng-blue">
            <div className="bg-white p-2 rounded-lg">
              <FakeQR size={176} color="#0057d9" />
            </div>
          </div>
          {/* Center TnG badge */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-md bg-tng-blue text-white text-[8px] font-bold flex items-center justify-center shadow">
              Tango<br />eWallet
            </div>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-gray-500 text-center">
          Refresh every 60 seconds<br />automatically
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between px-1">
        <div className="text-sm text-gray-600">eWallet balance</div>
        <div className="text-sm font-bold text-gray-900">{fmtRM(balance)}</div>
      </div>
    </div>
  );
}

function ReceiveTab() {
  return (
    <div className="px-4 py-4">
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="text-center text-sm text-gray-600">Scan this QR code to transfer to</div>
        <div className="text-center font-bold text-gray-900 leading-tight mt-1">
          KHAIROL &apos;IZZUL FIRDAUS BIN
          <br />
          KHAIROL HISAM
        </div>

        <div className="mt-4 flex flex-col items-center">
          <div className="p-2 rounded-xl bg-rose-600">
            <div className="bg-white rounded-lg p-3 flex flex-col items-center">
              <FakeQR size={176} color="#e11d48" />
              <div className="text-center text-[10px] font-semibold text-white bg-rose-600 rounded-b-lg px-3 py-1 -mx-3 mt-2 w-[calc(100%+1.5rem)]">
                MALAYSIA NATIONAL QR
              </div>
            </div>
          </div>
        </div>

        <button className="mt-5 w-full py-2.5 rounded-full bg-tng-blue text-white font-semibold flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> Download QR code
        </button>
        <button className="mt-2 w-full py-2.5 rounded-full border border-tng-blue text-tng-blue font-semibold">
          Enter specific amount
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 bg-white rounded-xl px-3 py-2">
        <div className="w-1.5 h-5 rounded bg-rose-600" />
        <div className="text-sm font-semibold text-gray-800">DuitNow · Account number</div>
      </div>
    </div>
  );
}
