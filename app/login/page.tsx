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

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

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

          {/* Google Login */}
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: "#1E2D45", border: "1px solid #2B3D55", color: "#E2E8F0" }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.1 0 5.8 1.1 8 2.9l6-6C34.5 3.1 29.6 1 24 1 14.8 1 7 6.7 3.7 14.6l7 5.4C12.4 13.6 17.7 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.4 5.7c4.3-4 6.8-9.9 6.8-16.9z"/>
              <path fill="#FBBC05" d="M10.7 28.6A14.8 14.8 0 0 1 9.5 24c0-1.6.3-3.2.7-4.6l-7-5.4A23.8 23.8 0 0 0 .5 24c0 3.9.9 7.5 2.7 10.7l7.5-6.1z"/>
              <path fill="#34A853" d="M24 47c5.5 0 10.2-1.8 13.6-4.9l-7.4-5.7c-1.8 1.2-4.1 1.9-6.2 1.9-6.3 0-11.6-4.2-13.5-9.9l-7.5 6.1C7 42.3 14.8 47 24 47z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "#1E2D45" }} />
            <span className="text-xs" style={{ color: "#475569" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "#1E2D45" }} />
          </div>

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
