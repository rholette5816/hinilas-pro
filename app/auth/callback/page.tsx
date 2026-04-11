"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    const supabase = createClient();
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          setStatus(`Error: ${error.message}`);
        } else if (data.session) {
          setStatus("Success! Redirecting...");
          window.location.href = "/";
        } else {
          setStatus("No session returned. Please try again.");
        }
      });
    } else {
      setStatus("No code found in URL.");
    }
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
