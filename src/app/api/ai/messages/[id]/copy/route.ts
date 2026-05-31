import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  if (user.must_change_password) return NextResponse.json({ error: "请先修改初始密码。" }, { status: 403 });

  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  const { data: message, error: messageError } = await supabase
    .from("ai_messages")
    .select("id,conversation_id,role")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (messageError) return NextResponse.json({ error: messageError.message }, { status: 500 });
  if (!message) return NextResponse.json({ error: "没有找到该消息。" }, { status: 404 });

  const { error } = await supabase.from("behavior_events").insert({
    user_id: user.id,
    session_id: user.session_id,
    event_type: "ai_message_copied",
    page: "ai_chat",
    target_type: "ai_message",
    target_id: id,
    event_payload: {
      conversation_id: message.conversation_id,
      role: message.role
    }
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
