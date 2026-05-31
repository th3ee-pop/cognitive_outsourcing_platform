import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  if (user.must_change_password) return NextResponse.json({ error: "请先修改初始密码。" }, { status: 403 });

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const patch: Record<string, string | null> = {
    updated_at: new Date().toISOString()
  };

  if (typeof body.title === "string") patch.title = body.title.trim().slice(0, 80) || "新的 AI 对话";
  if (body.archived === true) patch.archived_at = new Date().toISOString();
  if (body.archived === false) patch.archived_at = null;
  if (typeof body.task_stage === "string") patch.task_stage = body.task_stage;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_conversations")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id,task_id,title,task_stage,model,system_prompt_version,archived_at,last_message_at,created_at,updated_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "没有找到该对话。" }, { status: 404 });
  return NextResponse.json({ conversation: data });
}
