"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {

  useEffect(() => {
    const supabase = createClient();

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) {
          window.location.href = "/";
        } else {
          window.location.href = "/login";
        }
      });
    } else {
      // Check if already signed in (e.g. hash-based flow)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          window.location.href = "/";
        } else {
          window.location.href = "/login";
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
