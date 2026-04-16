"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ReferralRedirect() {
  const router = useRouter();
  const { code } = useParams<{ code: string }>();

  useEffect(() => {
    if (code) {
      document.cookie = `referral_code=${code}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
    }
    router.replace("/home");
  }, [code, router]);

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#0F172A" }}>
      <p className="text-gray-400 text-sm">Redirecting...</p>
    </div>
  );
}
