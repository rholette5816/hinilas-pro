"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  sessionId: string;
  title?: string;
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

type ConversationSession = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type ConversationSidebarProps = {
  refreshKey: number;
  onSessionChange: () => void;
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

function autoTitleFromMessage(message: string) {
  const title = message.replace(/\s+/g, " ").trim();
  if (!title) return "New Chat";
  return title.length > 45 ? `${title.slice(0, 45)}...` : title;
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) return "";

  const diffMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d ago`;

  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
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

function ConversationSidebar({ refreshKey, onSessionChange }: ConversationSidebarProps) {
  const { activeSessionId, setActiveSessionId, setChatMessages } = useApp();
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [loading, setLoading] = useState(false);
  const initializedRef = useRef(false);

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/chat/sessions");
    if (!res.ok) {
      setSessions([]);
      return [];
    }

    const data = await res.json();
    const nextSessions = Array.isArray(data) ? data as ConversationSession[] : [];
    setSessions(nextSessions);
    return nextSessions;
  }, []);

  const createSession = useCallback(async () => {
    const res = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Chat" }),
    });
    if (!res.ok) return null;
    return await res.json() as ConversationSession;
  }, []);

  const ensureFallbackSession = useCallback(async (nextSessions: ConversationSession[]) => {
    const fallback = nextSessions[0];
    if (fallback) {
      await setActiveSessionId(fallback.id);
      return;
    }

    const created = await createSession();
    if (!created) return;
    await setActiveSessionId(created.id);
    await setChatMessages(created.id, []);
    await fetchSessions();
  }, [createSession, fetchSessions, setActiveSessionId, setChatMessages]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions, refreshKey]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function initializeSessions() {
      const nextSessions = await fetchSessions();
      if (activeSessionId) return;
      await ensureFallbackSession(nextSessions);
    }

    void initializeSessions();
  }, [activeSessionId, ensureFallbackSession, fetchSessions]);

  async function handleNewChat() {
    setLoading(true);
    onSessionChange();
    try {
      const created = await createSession();
      if (!created) return;
      await setActiveSessionId(created.id);
      await setChatMessages(created.id, []);
      await fetchSessions();
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(sessionId: string) {
    if (sessionId === activeSessionId) return;
    onSessionChange();
    await setActiveSessionId(sessionId);
  }

  async function handleDelete(sessionId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) return;
      const nextSessions = (await fetchSessions()).filter(session => session.id !== sessionId);
      if (sessionId === activeSessionId) {
        onSessionChange();
        await ensureFallbackSession(nextSessions);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside
      className="hidden md:flex w-60 shrink-0 flex-col"
      style={{ background: "#F9F9F8", borderRight: "1px solid rgba(0,0,0,0.08)" }}
    >
      {/* Sidebar header */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #1877F2, #D97706)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider leading-none" style={{ color: "#D97706" }}>Hilas AI</p>
            <p className="text-xs font-medium leading-none mt-0.5" style={{ color: "#64748B" }}>Advanced Mode</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleNewChat}
          disabled={loading}
          className="w-full rounded-xl px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #1877F2, #D97706)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {sessions.map(session => {
          const isActive = session.id === activeSessionId;
          return (
            <div
              key={session.id}
              className="group relative mx-2 mb-1 rounded-r-lg border-l-[3px]"
              style={{
                background: isActive ? "rgba(217,119,6,0.08)" : "transparent",
                borderLeftColor: isActive ? "#D97706" : "transparent",
              }}
            >
              <button
                type="button"
                onClick={() => handleSelect(session.id)}
                className="w-full px-3 py-2 pr-9 text-left"
              >
                <span className="block truncate text-sm font-bold" style={{ color: "#0F172A" }}>
                  {session.title || "New Chat"}
                </span>
                <span className="block truncate text-xs" style={{ color: "#64748B" }}>
                  {formatRelativeDate(session.updated_at)}
                </span>
              </button>
              <button
                type="button"
                onClick={event => {
                  event.stopPropagation();
                  void handleDelete(session.id);
                }}
                className="absolute right-2 top-2 h-6 w-6 rounded-full text-sm font-bold opacity-0 transition-opacity group-hover:opacity-100"
                style={{ color: "#64748B", background: "rgba(0,0,0,0.05)" }}
                aria-label="Delete chat"
              >
                &times;
              </button>
            </div>
          );
        })}

        {!loading && sessions.length === 0 ? (
          <p className="px-4 py-3 text-xs" style={{ color: "#64748B" }}>No chats yet</p>
        ) : null}
      </div>
    </aside>
  );
}

export default function AdvancedChatPage() {
  const router = useRouter();
  const {
    setup,
    credits,
    refreshCredits,
    activeSessionId,
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
  const [sessionsRefreshKey, setSessionsRefreshKey] = useState(0);
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

  useEffect(() => {
    setPendingIntent(null);
  }, [activeSessionId]);

  function refreshSessionsList() {
    setSessionsRefreshKey(key => key + 1);
  }

  async function saveChatMessages(sessionId: string, messages: ChatMessage[], title?: string) {
    await setChatMessages(sessionId, messages, title);
    refreshSessionsList();
  }

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

  async function appendAssistantText(text: string, messagesSoFar: ChatMessage[] = chatMessages, sessionId: string | null = activeSessionId) {
    if (!sessionId) return;

    const assistantMsg: ChatMessage = {
      id: newId(),
      role: "assistant",
      text,
      card: "text",
      intent: "knowledge",
      createdAt: new Date().toISOString(),
    };
    await saveChatMessages(sessionId, [...messagesSoFar, assistantMsg]);
  }

  async function handleAssistantResponse(data: AdvancedResponse, messagesSoFar: ChatMessage[], sessionId: string, title?: string) {
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
    await saveChatMessages(sessionId, updated, title);

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
    const sessionId = activeSessionId;
    const messageText = (overrideText ?? input).trim();
    const image = attachedImage;
    if (!messageText && !image) return;
    if (!hasSetup) {
      router.push("/");
      return;
    }
    if (!sessionId) {
      setNotice("Starting a new chat. Please try again in a moment.");
      return;
    }

    setNotice("");
    const title = chatMessages.length === 0 ? autoTitleFromMessage(messageText) : undefined;
    const userMsg: ChatMessage = {
      id: newId(),
      role: "user",
      text: messageText,
      images: image ? [image] : [],
      createdAt: new Date().toISOString(),
    };
    const newMessages = [...chatMessages, userMsg];
    await saveChatMessages(sessionId, newMessages);
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
        await appendAssistantText(data.error || "Something went wrong. Please try again.", newMessages, sessionId);
        return;
      }

      if (data.requiresConfirm) {
        setPendingIntent({ intent: data.intent, cost: data.cost, message: messageText, images: image ? [image] : [], sessionId, title });
        const confirmMsg: ChatMessage = {
          id: newId(),
          role: "assistant",
          text: "",
          intent: data.intent,
          card: "confirm",
          cost: data.cost,
          createdAt: new Date().toISOString(),
        };
        await saveChatMessages(sessionId, [...newMessages, confirmMsg], title);
        return;
      }

      await handleAssistantResponse(data, newMessages, sessionId, title);
    } catch {
      await appendAssistantText("Something went wrong. Please try again.", newMessages, sessionId);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!pendingIntent || !hasSetup) return;
    const sessionId = pendingIntent.sessionId;
    if (activeSessionId !== sessionId) {
      setPendingIntent(null);
      return;
    }

    const messagesWithoutConfirm = chatMessages.filter(msg => msg.card !== "confirm");
    if (credits < pendingIntent.cost) {
      setPendingIntent(null);
      await appendAssistantText("Not enough credits. Please top up to continue.", messagesWithoutConfirm, sessionId);
      return;
    }

    setLoading(true);
    setNotice("");
    await saveChatMessages(sessionId, messagesWithoutConfirm);

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
        await appendAssistantText(data.code === "NO_CREDITS" ? "Not enough credits. Please top up to continue." : data.error || "Something went wrong. Please try again.", messagesWithoutConfirm, sessionId);
        return;
      }

      await handleAssistantResponse(data, messagesWithoutConfirm, sessionId, pendingIntent.title);
    } catch {
      await refreshCredits();
      await appendAssistantText("Something went wrong. Please try again.", messagesWithoutConfirm, sessionId);
    } finally {
      setPendingIntent(null);
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!activeSessionId) return;
    setPendingIntent(null);
    await saveChatMessages(activeSessionId, chatMessages.filter(msg => msg.card !== "confirm"));
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
    if (!setup || creativeLoadingId || !activeSessionId) return;
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
      await saveChatMessages(activeSessionId, updated);
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
        <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#1c1e21" }}>
          {msg.text}
        </div>
      );
    }

    return (
      <div>
        {msg.cost ? (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#D97706" }}>{actionLabel(msg.intent || "")}</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(217,119,6,0.1)", color: "#D97706" }}>{msg.cost} cr</span>
          </div>
        ) : null}
        {msg.images?.length ? (
          <div className="mb-4 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.08)", maxWidth: "480px" }}>
            <img src={msg.images[0]} alt="Generated creative" className="w-full object-contain bg-black" />
          </div>
        ) : null}
        {msg.text && msg.card !== "creative" ? <AIOutput content={msg.text} /> : null}
        {msg.text && msg.card === "creative" && !msg.images?.length ? (
          <p className="text-sm" style={{ color: "#1c1e21" }}>{msg.text}</p>
        ) : null}
        {renderActions(msg) ? (
          <div className="mt-4 flex flex-wrap gap-2">{renderActions(msg)}</div>
        ) : null}
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
    <main className="h-screen flex flex-col pt-14 md:pt-12 overflow-hidden" style={{ background: "#F9F9F8" }}>
      <div className="flex flex-1 overflow-hidden">
        <ConversationSidebar
          refreshKey={sessionsRefreshKey}
          onSessionChange={() => {
            setPendingIntent(null);
            setNotice("");
          }}
        />

        {/* Main chat column */}
        <div className="min-w-0 flex-1 flex flex-col overflow-hidden">

          {/* Slim top bar */}
          <div className="flex-shrink-0 flex items-center justify-end px-6 py-2 border-b" style={{ borderColor: "rgba(0,0,0,0.06)", background: "#F9F9F8" }}>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(217,119,6,0.1)", color: "#D97706", border: "1px solid rgba(217,119,6,0.2)" }}>
              {credits} credits
            </div>
          </div>

          {notice && (
            <div className="flex-shrink-0 px-6 py-2 text-xs font-semibold text-center" style={{ color: "#D97706", background: "rgba(217,119,6,0.06)", borderBottom: "1px solid rgba(217,119,6,0.12)" }}>
              {notice}
            </div>
          )}

          {/* Messages */}
          <section className="min-h-0 flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-20 text-center">
                  <div className="w-14 h-14 rounded-2xl mb-6 flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #1877F2, #D97706)" }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <p className="text-2xl font-bold mb-2" style={{ color: "#1c1e21" }}>How can I help your marketing?</p>
                  <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: "#64748B" }}>Tell me what you're working on. I'll help you research, build angles, write copy, analyze results, or generate creatives.</p>
                  <div className="flex flex-wrap gap-2 justify-center max-w-md">
                    {chips.map(chip => (
                      <button
                        key={chip.label}
                        onClick={() => handleChipTap(chip)}
                        className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:shadow-sm"
                        style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.09)", color: "#374151" }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg shrink-0 mt-0.5 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1877F2, #D97706)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                  )}
                  <div className={msg.role === "user" ? "max-w-xl" : "flex-1 min-w-0"}>
                    {msg.role === "user" ? (
                      <div className="rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap" style={{ background: "#1877F2", color: "#ffffff" }}>
                        {msg.images?.length ? <img src={msg.images[0]} alt="Attachment" className="mb-2 max-h-52 rounded-lg object-contain bg-black" /> : null}
                        {msg.text || "Attached image"}
                      </div>
                    ) : renderAssistantMessage(msg)}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1877F2, #D97706)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <div className="flex items-center gap-1 px-4 py-3 rounded-2xl text-sm" style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", color: "#94A3B8" }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#D97706", animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#D97706", animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#D97706", animationDelay: "300ms" }} />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </section>

          {/* Composer — Claude-style floating box */}
          <div className="flex-shrink-0 px-6 pb-6 pt-3" style={{ background: "#F9F9F8" }}>
            <div className="max-w-3xl mx-auto">
              {/* Chips — only shown when messages exist */}
              {chatMessages.length > 0 && chips.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                  {chips.map(chip => (
                    <button
                      key={chip.label}
                      onClick={() => handleChipTap(chip)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all hover:brightness-95"
                      style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)", color: "#64748B" }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}

              {attachedImage && (
                <div className="mb-2 flex items-center gap-2 px-1">
                  <img src={attachedImage} alt="Attachment preview" className="w-14 h-14 rounded-lg object-cover" />
                  <button onClick={() => setAttachedImage(null)} className="text-xs font-medium" style={{ color: "#94A3B8" }}>Remove</button>
                </div>
              )}

              <div className="flex items-end gap-2 rounded-2xl px-4 py-3 shadow-sm" style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)" }}>
                <label className="cursor-pointer p-1.5 rounded-lg shrink-0 transition-all hover:brightness-95" style={{ background: "rgba(0,0,0,0.04)" }}>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageAttach} />
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                </label>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Message Hilas AI..."
                  rows={1}
                  className="flex-1 resize-none text-sm focus:outline-none bg-transparent"
                  style={{ color: "#1c1e21", maxHeight: "160px", lineHeight: "1.6" }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && !attachedImage) || loading || !activeSessionId}
                  className="p-2 rounded-lg shrink-0 transition-all disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg, #1877F2, #D97706)" }}
                  aria-label="Send"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                </button>
              </div>
              <p className="text-center text-xs mt-2" style={{ color: "#CBD5E1" }}>Hilas AI can make mistakes. Verify important outputs.</p>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
