import { NextResponse } from "next/server";
import { ctsItems, scoreCts } from "@/data/cts";
import { getSessionUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    if (user.must_change_password) return NextResponse.json({ error: "请先修改初始密码。" }, { status: 403 });

    const { answers } = await request.json();
    const itemIds = new Set(ctsItems.map((item) => item.id));
    const normalized = Object.fromEntries(
      Object.entries(answers || {}).filter(([key, value]) => itemIds.has(key) && Number(value) >= 1 && Number(value) <= 5)
    ) as Record<string, number>;

    if (Object.keys(normalized).length !== ctsItems.length) {
      return NextResponse.json({ error: "请完成所有 CTS 题项后再提交。" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: form } = await supabase
      .from("survey_forms")
      .select("id")
      .eq("title", "CTS 计算思维前测量表")
      .maybeSingle();

    const payload = {
      user_id: user.id,
      survey_id: form?.id ?? null,
      answers_json: normalized,
      scores_json: scoreCts(normalized),
      submitted_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("survey_responses")
      .upsert(payload, { onConflict: "user_id,survey_id" });

    if (error) throw error;
    return NextResponse.json({ ok: true, scores: payload.scores_json });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交量表失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
