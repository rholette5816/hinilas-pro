"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    const supabase = createClient();

    async function handleCallback() {
      // Try hash fragment (implicit flow)
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error) {
          window.location.replace("/");
          return;
        } else {
          setStatus(`Error: ${error.message}`);
          return;
        }
      }

      // Try PKCE code
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          window.location.replace("/");
          return;
        } else {
          setStatus(`Error: ${error.message}`);
          return;
        }
      }

      setStatus("Debug: hash=" + (hash || "empty") + " | search=" + window.location.search);
    }

    handleCallback();
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
