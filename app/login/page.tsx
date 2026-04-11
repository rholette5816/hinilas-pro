"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import HinilasLogo from "@/components/HinilasLogo";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Check your email to confirm your account, then log in.");
        setMode("login");
      }
    }

    setLoading(false);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#0B1120" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <HinilasLogo size="lg" showTagline={false} />
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{ background: "#0F172A", border: "1px solid #1E2D45" }}
        >
          <h2 className="text-white text-xl font-semibold mb-1">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-sm mb-6" style={{ color: "#94A3B8" }}>
            {mode === "login"
              ? "Log in to continue to Hinilas Pro"
              : "Sign up to get started"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "#94A3B8" }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:ring-2"
                style={{
                  background: "#1E2D45",
                  border: "1px solid #2B3D55",
                }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: "#94A3B8" }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:ring-2"
                style={{
                  background: "#1E2D45",
                  border: "1px solid #2B3D55",
                }}
              />
            </div>

            {error && (
              <p className="text-sm" style={{ color: "#F87171" }}>
                {error}
              </p>
            )}
            {message && (
              <p className="text-sm" style={{ color: "#34D399" }}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold text-sm transition-opacity"
              style={{
                background: "#F5A623",
                color: "#0B1120",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Log In"
                : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "#94A3B8" }}>
            {mode === "login" ? "No account yet? " : "Already have an account? "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
                setMessage("");
              }}
              className="font-semibold"
              style={{ color: "#2B7EC9" }}
            >
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#475569" }}>
          By Basta Mag Ads Hilas
        </p>
      </div>
    </div>
  );
}
