"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.push("/");
        router.refresh();
      }
    });

    // Also handle code exchange manually if needed
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) {
          router.push("/");
          router.refresh();
        } else {
          router.push("/login");
        }
      });
    }
  }, [router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0B1120" }}
    >
      <p className="text-white text-sm">Signing you in...</p>
    </div>
  );
}
