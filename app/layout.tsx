import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tango Wallet Assistant",
  description: "AI-powered e-wallet demo with Tango assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-[100dvh] flex items-center justify-center bg-[#0b1220]">
        {children}
      </body>
    </html>
  );
}
