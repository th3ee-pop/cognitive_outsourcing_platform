import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("external_ai_disclosures")
    .select("id,tool_name,usage_stage,prompt_summary,adoption_description,approximate_time,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ disclosures: data ?? [] });
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    if (user.must_change_password) return NextResponse.json({ error: "请先修改初始密码。" }, { status: 403 });

    const body = await request.json();
    if (!body.tool_name || !body.usage_stage) {
      return NextResponse.json({ error: "请至少填写工具名称和使用环节。" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("external_ai_disclosures").insert({
      user_id: user.id,
      tool_name: body.tool_name,
      usage_stage: body.usage_stage,
      prompt_summary: body.prompt_summary || "",
      adoption_description: body.adoption_description || "",
      approximate_time: body.approximate_time || ""
    });

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交披露失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
