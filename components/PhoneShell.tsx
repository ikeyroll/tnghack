"use client";
import { cn } from "@/lib/utils";

export default function PhoneShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("phone-frame", className)}>
      <div className="notch" />
      <div className="flex-1 overflow-hidden relative">{children}</div>
    </div>
  );
}
