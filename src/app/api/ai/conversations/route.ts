import { NextResponse } from "next/server";
import { makeConversationTitle } from "@/lib/ai/core";
import { getSessionUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AiConversation } from "@/lib/types";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const archived = searchParams.get("archived") === "true";
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("ai_conversations")
    .select("id,task_id,title,task_stage,model,system_prompt_version,archived_at,last_message_at,created_at,updated_at")
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  query = archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  const { data, error } = await query.returns<AiConversation[]>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversations: data ?? [] });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  if (user.must_change_password) return NextResponse.json({ error: "请先修改初始密码。" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const now = new Date().toISOString();
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-pro";
  const title = makeConversationTitle(String(body.title || ""));
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      user_id: user.id,
      task_id: body.task_id || "main_task",
      title,
      task_stage: body.task_stage || "任务探索",
      model,
      system_prompt_version: "v1",
      last_message_at: now,
      updated_at: now
    })
    .select("id,task_id,title,task_stage,model,system_prompt_version,archived_at,last_message_at,created_at,updated_at")
    .single<AiConversation>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversation: data });
}
