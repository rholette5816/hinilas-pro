"use client";

import { useState, useRef, useEffect } from "react";
import { useApp, buildUserContext } from "@/lib/context";
import { HILAS_KNOWLEDGE } from "@/lib/knowledge";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const SYSTEM_PROMPT = (userContext: string) => `
You are the Hinilas Pro AI Assistant — a smart, direct advisor for Filipino business owners running Meta Ads.

Your ONLY job is to answer questions about:
- Meta Ads strategy, setup, targeting, budgets, scaling
- The user's specific business and products
- How to use Hinilas Pro tools (Research, Angles, Caption, Creative, Audit, Content Creation, Campaign Setup)
- Marketing, copywriting, ad angles, hooks
- Reading and interpreting ad results
- Filipino eCommerce and COD business context

If a question is completely outside this scope, respond with:
"Hindi ko yan sakop dito. Focused ako sa Meta Ads, marketing, at Hinilas Pro. May tanong ka ba tungkol sa ads o business mo?"

USER'S BUSINESS CONTEXT (use this to make answers specific to their business):
${userContext}

HINILAS PRO KNOWLEDGE BASE:
${HILAS_KNOWLEDGE}

Rules:
- Be direct and concise. No fluff.
- Use the user's language/dialect naturally if they write in Tagalog, Bisaya, or Taglish — match their language.
- Never use em dashes.
- Keep responses focused and actionable.
- If they ask how to use a Hinilas Pro tool, explain it clearly based on the knowledge base above.
`.trim();

export default function AIAssistant() {
  const { setup } = useApp();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        text: "Hi! I'm your Hinilas Pro AI Assistant. Ask me anything about Meta Ads, your business, or how to use the tools here.",
      }]);
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    const userContext = setup ? buildUserContext(setup) : "No business profile set up yet.";
    const history = messages.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`).join("\n");
    const fullPrompt = history ? `${history}\nUser: ${userText}` : userText;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fullPrompt,
          systemPrompt: SYSTEM_PROMPT(userContext),
          module: "ai-assistant",
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: data.content || data.error || "Something went wrong. Try again.",
      }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* Trigger button — rendered inline in TopBar */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #1877F2, #7C3AED)", color: "#fff", border: "none" }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-2h2zm0-4h-2V7h2z"/></svg>
        AI Assistant
      </button>

      {/* Popup */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end pointer-events-none">
          {/* Backdrop */}
          <div
            className="absolute inset-0 pointer-events-auto"
            style={{ background: "rgba(0,0,0,0.3)" }}
            onClick={() => setOpen(false)}
          />

          {/* Chat panel */}
          <div
            className="relative pointer-events-auto flex flex-col m-4 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              width: "min(420px, calc(100vw - 32px))",
              height: "min(600px, calc(100vh - 32px))",
              background: "#FFFFFF",
              border: "1px solid #E4E6EB",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ background: "linear-gradient(135deg, #1877F2, #7C3AED)", borderBottom: "1px solid rgba(255,255,255,0.15)" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-2h2zm0-4h-2V7h2z"/></svg>
                </div>
                <div>
                  <p className="text-white text-sm font-bold leading-none">AI Assistant</p>
                  <p className="text-white/70 text-xs mt-0.5">Hinilas Pro</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/70 hover:text-white transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: "#F8FAFC" }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[85%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                    style={msg.role === "user"
                      ? { background: "#1877F2", color: "#fff", borderRadius: "18px 18px 4px 18px" }
                      : { background: "#FFFFFF", color: "#1C1E21", border: "1px solid #E4E6EB", borderRadius: "18px 18px 18px 4px" }
                    }
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl flex gap-1 items-center" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB", borderRadius: "18px 18px 18px 4px" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 px-3 py-3" style={{ background: "#FFFFFF", borderTop: "1px solid #E4E6EB" }}>
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about Meta Ads or your business..."
                  rows={1}
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm text-[#1c1e21] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  style={{ background: "#F0F2F5", border: "1px solid #E4E6EB", maxHeight: "100px" }}
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-opacity disabled:opacity-30 hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #1877F2, #7C3AED)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 px-1">Shift+Enter for new line. Enter to send.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
