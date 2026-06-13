import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@/lib/context";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function normalizeTitle(value: unknown) {
  if (typeof value !== "string") return null;
  const title = value.trim();
  return title || null;
}

function isChatMessages(value: unknown): value is ChatMessage[] {
  return Array.isArray(value);
}

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, user_id, title, messages, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const update: { messages?: ChatMessage[]; title?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  if ("messages" in body) {
    if (!isChatMessages(body.messages)) {
      return NextResponse.json({ error: "messages must be an array" }, { status: 400 });
    }
    update.messages = body.messages;
  }

  if ("title" in body) {
    const title = normalizeTitle(body.title);
    if (!title) {
      return NextResponse.json({ error: "title must be a non-empty string" }, { status: 400 });
    }
    update.title = title;
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, user_id, title, messages, created_at, updated_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
