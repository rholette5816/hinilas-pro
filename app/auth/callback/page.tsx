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
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) {
          window.location.replace("/");
        } else {
          setStatus(`Error: ${error.message}`);
        }
      });
    } else {
      const errorDesc = url.searchParams.get("error_description");
      setStatus(errorDesc ? `Error: ${errorDesc}` : "No code found. Please try again.");
    }
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0B1120" }}
    >
      <p className="text-white text-sm px-8 text-center">{status}</p>
    </div>
  );
}
