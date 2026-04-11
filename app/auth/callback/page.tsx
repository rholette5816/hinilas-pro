"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    const supabase = createClient();

    // Listen for auth state — handles both PKCE and implicit flow
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setStatus("Success! Redirecting...");
        window.location.href = "/";
      }
    });

    // Also check if session already exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = "/";
      }
    });

    // Handle PKCE code if present
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          setStatus(`Error: ${error.message}`);
        } else if (data.session) {
          window.location.href = "/";
        }
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0B1120" }}
    >
      <p className="text-white text-sm">{status}</p>
    </div>
  );
}
