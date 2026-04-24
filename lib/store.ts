"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Recipient, WALLET } from "./db";

export type Screen =
  | "home"
  | "transfer-recipient"
  | "transfer-money"
  | "auth"
  | "processing"
  | "receipt"
  | "watch"
  | "receive"
  | "prepaid"
  | "donation"
  | "cashloan"
  | "scan"
  | "pay";

export type ActionLogEntry = {
  id: string;
  ts: number;
  type: "transfer" | "scam-blocked" | "faq" | "whatsapp-upload" | "watch-merchant" | "watch-handoff";
  summary: string;
  details?: Record<string, any>;
};

export type Device = "phone" | "watch";

export type FlowState = {
  screen: Screen;
  device: Device;
  showTransferSheet: boolean;
  showTango: boolean;

  recipient?: Recipient;
  amount?: number;
  note: string;

  balance: number;
  lastReceiptId?: string;

  // Persistent action history visible in Tango history drawer
  actionLog: ActionLogEntry[];

  // For phone handoff from watch
  handoffMessage?: string;

  // Remote pairing code (used by /remote watch controller)
  pairCode?: string;

  // actions
  setScreen: (s: Screen) => void;
  setDevice: (d: Device) => void;
  setShowTransferSheet: (v: boolean) => void;
  setShowTango: (v: boolean) => void;
  setRecipient: (r?: Recipient) => void;
  setAmount: (n?: number) => void;
  setNote: (n: string) => void;
  setHandoff: (msg?: string) => void;
  setPairCode: (code?: string) => void;

  logAction: (entry: Omit<ActionLogEntry, "id" | "ts">) => void;
  clearActionLog: () => void;

  startTransfer: (r: Recipient, amount?: number, note?: string) => void;
  confirmAmount: () => void;
  authenticate: () => Promise<void>;
  completeProcessing: () => void;
  resetToHome: () => void;
};

export const useApp = create<FlowState>()(
  persist(
    (set, get) => ({
  screen: "home",
  device: "phone",
  showTransferSheet: false,
  showTango: false,

  note: "Fund Transfer",
  balance: WALLET.balance,
  actionLog: [],

  setScreen: (s) => set({ screen: s }),
  setDevice: (d) => set({ device: d }),
  setShowTransferSheet: (v) => set({ showTransferSheet: v }),
  setShowTango: (v) => set({ showTango: v }),
  setRecipient: (r) => set({ recipient: r }),
  setAmount: (n) => set({ amount: n }),
  setNote: (n) => set({ note: n }),
  setHandoff: (msg) => set({ handoffMessage: msg }),
  setPairCode: (code) => set({ pairCode: code }),

  logAction: (entry) =>
    set((state) => ({
      actionLog: [
        { id: "a" + Date.now() + Math.random().toString(36).slice(2, 6), ts: Date.now(), ...entry },
        ...state.actionLog,
      ].slice(0, 50),
    })),
  clearActionLog: () => set({ actionLog: [] }),

  startTransfer: (r, amount, note) =>
    set({
      recipient: r,
      amount,
      note: note ?? "Fund Transfer",
      screen: "transfer-money",
      showTransferSheet: false,
      showTango: false,
      device: "phone",
    }),

  confirmAmount: () => set({ screen: "auth" }),

  authenticate: async () => {
    set({ screen: "processing" });
  },

  completeProcessing: () => {
    const { amount = 0, balance } = get();
    set({
      balance: Math.max(0, +(balance - amount).toFixed(2)),
      screen: "receipt",
      lastReceiptId: "RC" + Date.now().toString().slice(-8),
    });
  },

  resetToHome: () =>
    set({
      screen: "home",
      recipient: undefined,
      amount: undefined,
      note: "Fund Transfer",
      showTransferSheet: false,
    }),
}),
    {
      name: "tango-wallet-state-v2",
      storage: createJSONStorage(() => (typeof window === "undefined" ? (undefined as any) : window.localStorage)),
      // only persist history & balance; don't persist transient UI state
      partialize: (s) => ({ actionLog: s.actionLog, balance: s.balance, pairCode: s.pairCode }) as any,
    },
  ),
);
