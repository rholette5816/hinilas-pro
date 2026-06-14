import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function normalizeName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name || null;
}

function normalizeColor(value: unknown) {
  if (typeof value !== "string") return "#64748B";
  const color = value.trim();
  return color || "#64748B";
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("chat_projects")
    .select("id, name, color, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = normalizeName(body.name);

  if (!name) {
    return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("chat_projects")
    .insert({
      user_id: user.id,
      name,
      color: normalizeColor(body.color),
    })
    .select("id, name, color, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
