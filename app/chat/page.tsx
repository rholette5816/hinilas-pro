"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AIOutput from "@/components/AIOutput";
import { ChatMessage, useApp } from "@/lib/context";
import { buildUserContext } from "@/lib/user-context";
import { MODULE_PROMPTS } from "@/lib/knowledge";

type PendingIntent = {
  intent: string;
  cost: number;
  message: string;
  images: string[];
};

type AdvancedResponse = {
  intent: string;
  cost: number;
  content?: string;
  renderButton?: boolean;
  requiresConfirm?: boolean;
  error?: string;
  code?: string;
};

type Chip = {
  label: string;
  prompt?: string;
  action?: "setup" | "angle";
  value?: string;
};

const PAID_CARDS = ["research", "angles", "copy", "analyze_basic", "analyze_advanced"];

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function actionLabel(intent: string) {
  const labels: Record<string, string> = {
    research: "Market research",
    angles: "Generate angles",
    copy: "Write ad copy",
    analyze_basic: "Basic analysis",
    analyze_advanced: "Advanced audit",
    creative: "Creative generation",
  };
  return labels[intent] || "Generate output";
}

function cardForResponse(data: AdvancedResponse): ChatMessage["card"] {
  if (data.renderButton || data.intent === "creative") return "creative";
  if (PAID_CARDS.includes(data.intent)) return data.intent as ChatMessage["card"];
  return "text";
}

function extractAngleBlocks(content: string) {
  const matches = content.match(/(?:\*\*)?ANGLE\s+\d+:[\s\S]*?(?=(?:\n(?:\*\*)?ANGLE\s+\d+:)|$)/gi);
  if (matches?.length) return matches.map(block => block.trim()).filter(Boolean);
  return content
    .split(/\n(?=\d+\.\s+)/)
    .map(block => block.trim())
    .filter(block => block.length > 30)
    .slice(0, 5);
}

function angleButtonLabel(block: string, index: number) {
  const firstLine = block.split("\n").find(Boolean) || `Angle ${index + 1}`;
  return firstLine.replace(/\*\*/g, "").slice(0, 52);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function downloadReport(content: string, intent: string) {
  const html2pdf = (await import("html2pdf.js")).default;
  const wrapper = document.createElement("div");
  wrapper.style.padding = "32px";
  wrapper.style.fontFamily = "Inter, Arial, sans-serif";
  wrapper.style.color = "#111827";
  wrapper.style.background = "#FFFFFF";
  wrapper.innerHTML = `
    <div style="border-bottom:3px solid #1877F2;padding-bottom:18px;margin-bottom:24px">
      <p style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#D97706;font-weight:800;margin:0 0 6px">Hinilas Pro</p>
      <h1 style="font-size:28px;line-height:1.1;margin:0;color:#0F172A">Meta Ads Analysis Report</h1>
      <p style="font-size:12px;color:#64748B;margin:8px 0 0">${escapeHtml(intent.replace(/_/g, " "))}</p>
    </div>
    <div style="font-size:13px;line-height:1.6;white-space:pre-wrap">${escapeHtml(content)}</div>
  `;

  await html2pdf()
    .set({
      filename: `hinilas-${intent.replace(/_/g, "-")}-report.pdf`,
      margin: 0.35,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    })
    .from(wrapper)
    .save();
}

export default function AdvancedChatPage() {
  const router = useRouter();
  const {
    setup,
    credits,
    refreshCredits,
    chatMessages,
    setChatMessages,
    researchOutput,
    setResearchOutput,
    anglesOutput,
    setAnglesOutput,
    setCopyOutput,
    selectedAngle,
    setSelectedAngle,
    setCreativeImage,
    saveAdImages,
  } = useApp();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<PendingIntent | null>(null);
  const [sessionResearch, setSessionResearch] = useState(researchOutput || "");
  const [sessionAngles, setSessionAngles] = useState(anglesOutput || "");
  const [notice, setNotice] = useState("");
  const [creativeLoadingId, setCreativeLoadingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const hasSetup = !!setup?.businessName;
  const angleBlocks = useMemo(() => extractAngleBlocks(sessionAngles), [sessionAngles]);

  useEffect(() => {
    if (researchOutput) setSessionResearch(researchOutput);
  }, [researchOutput]);

  useEffect(() => {
    if (anglesOutput) setSessionAngles(anglesOutput);
  }, [anglesOutput]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages, loading]);

  const chips = useMemo<Chip[]>(() => {
    if (!hasSetup) return [{ label: "Set up my business", action: "setup" }];

    const next: Chip[] = [];
    if (!sessionResearch) {
      next.push({ label: "Research my market - 1 cr", prompt: "Research my market" });
    } else if (!sessionAngles) {
      next.push({ label: "Generate 5 angles - 1 cr", prompt: "Generate 5 ad angles from my research" });
    } else if (!selectedAngle) {
      angleBlocks.slice(0, 2).forEach((block, index) => {
        next.push({ label: angleButtonLabel(block, index), action: "angle", value: block });
      });
    } else {
      next.push(
        { label: "Write ad copy - 1 cr", prompt: "Write ad copy from my selected angle" },
        { label: "Make creative - 2 cr", prompt: "Make me a creative from my selected angle" }
      );
    }
    next.push({ label: "Ask anything (free)", prompt: "" });
    return next;
  }, [angleBlocks, hasSetup, selectedAngle, sessionAngles, sessionResearch]);

  async function appendAssistantText(text: string, messagesSoFar: ChatMessage[] = chatMessages) {
    const assistantMsg: ChatMessage = {
      id: newId(),
      role: "assistant",
      text,
      card: "text",
      intent: "knowledge",
      createdAt: new Date().toISOString(),
    };
    await setChatMessages([...messagesSoFar, assistantMsg]);
  }

  async function handleAssistantResponse(data: AdvancedResponse, messagesSoFar: ChatMessage[]) {
    const assistantMsg: ChatMessage = {
      id: newId(),
      role: "assistant",
      text: data.content || "",
      intent: data.intent,
      card: cardForResponse(data),
      cost: data.cost,
      renderButton: data.renderButton,
      createdAt: new Date().toISOString(),
    };

    const updated = [...messagesSoFar, assistantMsg];
    await setChatMessages(updated);

    if (data.intent === "research" && data.content) {
      setSessionResearch(data.content);
      setResearchOutput(data.content);
    }
    if (data.intent === "angles" && data.content) {
      setSessionAngles(data.content);
      setAnglesOutput(data.content);
    }
    if (data.intent === "copy" && data.content) {
      setCopyOutput(data.content);
    }
    if (data.intent === "select_angle" && data.content) {
      setSelectedAngle(data.content);
      setNotice("Angle saved for copy and creative.");
    }
    if (data.cost > 0 && data.intent !== "creative") {
      await refreshCredits();
    }
  }

  async function handleSend(overrideText?: string) {
    const messageText = (overrideText ?? input).trim();
    const image = attachedImage;
    if (!messageText && !image) return;
    if (!hasSetup) {
      router.push("/");
      return;
    }

    setNotice("");
    const userMsg: ChatMessage = {
      id: newId(),
      role: "user",
      text: messageText,
      images: image ? [image] : [],
      createdAt: new Date().toISOString(),
    };
    const newMessages = [...chatMessages, userMsg];
    await setChatMessages(newMessages);
    setInput("");
    setAttachedImage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText || "Analyze this screenshot.",
          images: image ? [image] : [],
          sessionState: { research: sessionResearch, selectedAngle },
        }),
      });
      const data = await res.json() as AdvancedResponse;

      if (!res.ok) {
        await appendAssistantText(data.error || "Something went wrong. Please try again.", newMessages);
        return;
      }

      if (data.requiresConfirm) {
        setPendingIntent({ intent: data.intent, cost: data.cost, message: messageText, images: image ? [image] : [] });
        const confirmMsg: ChatMessage = {
          id: newId(),
          role: "assistant",
          text: "",
          intent: data.intent,
          card: "confirm",
          cost: data.cost,
          createdAt: new Date().toISOString(),
        };
        await setChatMessages([...newMessages, confirmMsg]);
        return;
      }

      await handleAssistantResponse(data, newMessages);
    } catch {
      await appendAssistantText("Something went wrong. Please try again.", newMessages);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!pendingIntent || !hasSetup) return;

    const messagesWithoutConfirm = chatMessages.filter(msg => msg.card !== "confirm");
    if (credits < pendingIntent.cost) {
      setPendingIntent(null);
      await appendAssistantText("Not enough credits. Please top up to continue.", messagesWithoutConfirm);
      return;
    }

    setLoading(true);
    setNotice("");
    await setChatMessages(messagesWithoutConfirm);

    try {
      const res = await fetch("/api/chat/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: pendingIntent.message || "Continue",
          images: pendingIntent.images,
          sessionState: { research: sessionResearch, selectedAngle },
          intent: pendingIntent.intent,
          confirmed: true,
        }),
      });
      const data = await res.json() as AdvancedResponse;

      if (!res.ok) {
        await refreshCredits();
        await appendAssistantText(data.code === "NO_CREDITS" ? "Not enough credits. Please top up to continue." : data.error || "Something went wrong. Please try again.", messagesWithoutConfirm);
        return;
      }

      await handleAssistantResponse(data, messagesWithoutConfirm);
    } catch {
      await refreshCredits();
      await appendAssistantText("Something went wrong. Please try again.", messagesWithoutConfirm);
    } finally {
      setPendingIntent(null);
      setLoading(false);
    }
  }

  async function handleCancel() {
    setPendingIntent(null);
    await setChatMessages(chatMessages.filter(msg => msg.card !== "confirm"));
  }

  function handleImageAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAttachedImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function saveAngle(angle: string) {
    setSelectedAngle(angle);
    setNotice("Angle saved for copy and creative.");
  }

  function handleChipTap(chip: Chip) {
    if (chip.action === "setup") {
      router.push("/");
      return;
    }
    if (chip.action === "angle" && chip.value) {
      saveAngle(chip.value);
      return;
    }
    setInput(chip.prompt ?? "");
  }

  async function generateCreative(messageId: string, sourceText: string) {
    if (!setup || creativeLoadingId) return;
    if (credits < 2) {
      setNotice("Not enough credits. Please top up to generate a creative.");
      return;
    }

    setCreativeLoadingId(messageId);
    setNotice("");
    try {
      const angle = selectedAngle || sourceText || "General product promotion";
      const prompt = MODULE_PROMPTS.creative(
        buildUserContext(setup, setup.language),
        angle,
        "",
        "",
        "",
        "1:1",
        setup.industry
      );
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspectRatio: "1:1", angle }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setNotice(data.code === "NO_CREDITS" ? "Not enough credits. Please top up to continue." : data.error || "Creative generation failed.");
        await refreshCredits();
        return;
      }

      const image = data.images?.[0] as string | undefined;
      if (!image) {
        setNotice("No image was generated. Please try again.");
        return;
      }

      setCreativeImage(image);
      await saveAdImages(image, null, null);
      await refreshCredits();
      const updated = chatMessages.map(msg => msg.id === messageId
        ? { ...msg, text: "Creative generated.", images: [image], renderButton: false }
        : msg
      );
      await setChatMessages(updated);
    } catch {
      setNotice("Creative generation failed. Please try again.");
    } finally {
      setCreativeLoadingId(null);
    }
  }

  function renderActions(msg: ChatMessage) {
    if (msg.card === "research") {
      return (
        <button
          onClick={() => {
            setSessionResearch(msg.text);
            setResearchOutput(msg.text);
            setNotice("Research saved for angles.");
          }}
          className="px-3 py-2 rounded-lg text-xs font-bold"
          style={{ background: "rgba(24,119,242,0.12)", color: "#60A5FA", border: "1px solid rgba(24,119,242,0.25)" }}
        >
          Use in Angles
        </button>
      );
    }

    if (msg.card === "angles") {
      const blocks = extractAngleBlocks(msg.text);
      return (
        <div className="flex flex-wrap gap-2">
          {blocks.map((block, index) => (
            <button
              key={`${msg.id}-${index}`}
              onClick={() => saveAngle(block)}
              className="px-3 py-2 rounded-lg text-xs font-bold"
              style={{ background: "rgba(24,119,242,0.12)", color: "#60A5FA", border: "1px solid rgba(24,119,242,0.25)" }}
            >
              Use angle {index + 1}
            </button>
          ))}
        </div>
      );
    }

    if (msg.card === "copy") {
      return (
        <button
          onClick={() => navigator.clipboard.writeText(msg.text)}
          className="px-3 py-2 rounded-lg text-xs font-bold"
          style={{ background: "rgba(255,255,255,0.08)", color: "#CBD5E1", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          Copy caption
        </button>
      );
    }

    if (msg.card === "analyze_basic" || msg.card === "analyze_advanced" || msg.card === "analyze") {
      return (
        <button
          onClick={() => downloadReport(msg.text, msg.intent || "analysis")}
          className="px-3 py-2 rounded-lg text-xs font-bold"
          style={{ background: "rgba(217,119,6,0.15)", color: "#FBBF24", border: "1px solid rgba(217,119,6,0.35)" }}
        >
          Get Report
        </button>
      );
    }

    if (msg.card === "creative") {
      return (
        <button
          onClick={() => generateCreative(msg.id, selectedAngle || msg.text)}
          disabled={creativeLoadingId === msg.id}
          className="px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
          style={{ background: "#D97706", color: "#000" }}
        >
          {creativeLoadingId === msg.id ? "Generating..." : "Generate creative - 2 credits"}
        </button>
      );
    }

    return null;
  }

  function renderAssistantMessage(msg: ChatMessage) {
    if (msg.card === "confirm") {
      const cost = msg.cost || 0;
      return (
        <div className="rounded-xl p-4 my-2 max-w-xl" style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.3)" }}>
          <p className="text-sm font-semibold mb-3" style={{ color: "#0F172A" }}>{actionLabel(msg.intent || "")} - {cost} credit{cost > 1 ? "s" : ""}</p>
          <div className="flex gap-2">
            <button onClick={handleConfirm} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: "#D97706", color: "#fff" }}>
              Confirm
            </button>
            <button onClick={handleCancel} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: "rgba(0,0,0,0.06)", color: "#64748B" }}>
              Cancel
            </button>
          </div>
        </div>
      );
    }

    if (msg.card === "text") {
      return (
        <div className="max-w-xl rounded-2xl px-4 py-3 whitespace-pre-wrap text-sm leading-relaxed" style={{ background: "#ffffff", color: "#1c1e21", border: "1px solid rgba(0,0,0,0.08)" }}>
          {msg.text}
        </div>
      );
    }

    return (
      <div className="max-w-2xl rounded-2xl p-3" style={{ background: "#ffffff", border: "1px solid rgba(217,119,6,0.3)" }}>
        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <div>
            <p className="text-xs uppercase font-black tracking-wider" style={{ color: "#D97706" }}>{actionLabel(msg.intent || "")}</p>
            {msg.cost ? <p className="text-xs" style={{ color: "#64748B" }}>{msg.cost} credit{msg.cost > 1 ? "s" : ""}</p> : null}
          </div>
          {msg.intent === "creative" ? <span className="text-xs font-bold" style={{ color: "#60A5FA" }}>Image action</span> : null}
        </div>
        {msg.images?.length ? (
          <div className="mb-3 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.08)" }}>
            <img src={msg.images[0]} alt="Generated creative" className="w-full max-h-[520px] object-contain bg-black" />
          </div>
        ) : null}
        {msg.text && msg.card !== "creative" ? <AIOutput content={msg.text} /> : null}
        {msg.text && msg.card === "creative" && !msg.images?.length ? (
          <p className="text-sm mb-3" style={{ color: "#1c1e21" }}>{msg.text}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {renderActions(msg)}
        </div>
      </div>
    );
  }

  if (!hasSetup) {
    return (
      <main className="min-h-screen flex flex-col pt-14 md:pt-12">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-white font-bold text-lg mb-2">Set up your business first</p>
          <p className="text-sm mb-6" style={{ color: "#64748B" }}>Advanced mode needs your business profile to generate results.</p>
          <button onClick={() => router.push("/")} className="px-6 py-3 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #1877F2, #D97706)" }}>
            Go to Setup
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col pt-14 md:pt-12 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "rgba(0,0,0,0.08)", background: "#ffffff" }}>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#D97706" }}>Hilas AI</p>
          <p className="text-sm font-black" style={{ color: "#0F172A" }}>Advanced Mode</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.25)" }}>
          <span className="text-xs font-bold" style={{ color: "#D97706" }}>{credits} cr</span>
        </div>
      </div>

      {notice && (
        <div className="flex-shrink-0 px-4 py-2 text-xs font-semibold" style={{ color: "#FBBF24", background: "rgba(217,119,6,0.1)", borderBottom: "1px solid rgba(217,119,6,0.18)" }}>
          {notice}
        </div>
      )}

      <section className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="mx-auto max-w-2xl pt-16 text-center">
            <p className="text-xl font-black mb-2" style={{ color: "#0F172A" }}>What do you want to build today?</p>
            <p className="text-sm" style={{ color: "#64748B" }}>Ask a free Meta Ads question, or request research, angles, copy, analysis, or a creative.</p>
          </div>
        ) : null}

        {chatMessages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "user" ? (
              <div className="max-w-xl rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap" style={{ background: "#1877F2", color: "#ffffff", border: "none" }}>
                {msg.images?.length ? <img src={msg.images[0]} alt="Attachment" className="mb-2 max-h-52 rounded-lg object-contain bg-black" /> : null}
                {msg.text || "Attached image"}
              </div>
            ) : renderAssistantMessage(msg)}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: "#ffffff", color: "#64748B", border: "1px solid rgba(0,0,0,0.08)" }}>
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </section>

      <div className="flex-shrink-0 px-4 py-3 border-t" style={{ borderColor: "rgba(0,0,0,0.08)", background: "#ffffff" }}>
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 flex-wrap">
          {chips.map(chip => (
            <button
              key={chip.label}
              onClick={() => handleChipTap(chip)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0"
              style={{ background: "rgba(24,119,242,0.12)", border: "1px solid rgba(24,119,242,0.25)", color: "#60A5FA" }}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {attachedImage && (
          <div className="mb-2 flex items-center gap-2">
            <img src={attachedImage} alt="Attachment preview" className="w-16 h-16 rounded-lg object-cover" />
            <button onClick={() => setAttachedImage(null)} className="text-xs font-bold" style={{ color: "#94A3B8" }}>Remove</button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <label className="cursor-pointer p-2 rounded-xl shrink-0" style={{ background: "rgba(0,0,0,0.06)" }}>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageAttach} />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          </label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask anything or tell me what to generate..."
            rows={1}
            className="flex-1 resize-none rounded-xl px-4 py-3 text-sm focus:outline-none"
            style={{ background: "#F0F2F5", border: "1px solid rgba(217,119,6,0.3)", color: "#1c1e21", maxHeight: "120px" }}
          />
          <button
            onClick={() => handleSend()}
            disabled={(!input.trim() && !attachedImage) || loading}
            className="p-3 rounded-xl disabled:opacity-40 shrink-0"
            style={{ background: "linear-gradient(135deg, #1877F2, #D97706)" }}
            aria-label="Send"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      </div>
    </main>
  );
}
