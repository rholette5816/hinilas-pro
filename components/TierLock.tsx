"use client";

import { useRouter } from "next/navigation";

interface TierLockProps {
  requiredTier: "Flex" | "Max";
  featureName: string;
}

function LockIcon({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export default function TierLock({ requiredTier, featureName }: TierLockProps) {
  const router = useRouter();
  const label = requiredTier === "Max" ? "Max Plan" : "Flex Plan";
  const color = requiredTier === "Max" ? "#8B5CF6" : "#1877F2";

  return (
    <div
      className="rounded-2xl border p-8 flex flex-col items-center justify-center text-center gap-4"
      style={{ background: "#FFFFFF", borderColor: "#E4E6EB", minHeight: 200 }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: `${color}15`, border: `1px solid ${color}40` }}
      >
        <LockIcon color={color} />
      </div>
      <div>
        <p className="font-bold text-[#1c1e21] text-base mb-1">{featureName}</p>
        <p className="text-sm text-[#64748B]">This feature requires {label} or above.</p>
      </div>
      <button
        onClick={() => router.push("/pricing")}
        className="px-5 py-2.5 rounded-lg text-sm font-bold text-white"
        style={{ background: color }}
      >
        Upgrade to {label}
      </button>
    </div>
  );
}
