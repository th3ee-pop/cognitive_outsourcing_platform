import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  if (!["teacher", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "没有导出权限。" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const [users, surveys, maps, disclosures, events] = await Promise.all([
    supabase.from("users_profile").select("username,anonymous_code,class_type,role,must_change_password,created_at"),
    supabase.from("survey_responses").select("user_id,answers_json,scores_json,submitted_at"),
    supabase.from("concept_maps").select("user_id,node_count,edge_count,cross_link_count,graph_json,submitted_at"),
    supabase.from("external_ai_disclosures").select("*"),
    supabase.from("behavior_events").select("*").order("created_at", { ascending: false }).limit(5000)
  ]);

  const firstError = [users, surveys, maps, disclosures, events].find((result) => result.error)?.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    users: users.data,
    surveyResponses: surveys.data,
    conceptMaps: maps.data,
    externalAiDisclosures: disclosures.data,
    behaviorEvents: events.data
  });
}
