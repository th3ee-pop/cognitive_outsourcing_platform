import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { ConceptMapPayload } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    if (user.must_change_password) return NextResponse.json({ error: "请先修改初始密码。" }, { status: 403 });

    const graph = (await request.json()) as ConceptMapPayload;
    if (!graph.nodes?.length) {
      return NextResponse.json({ error: "图谱至少需要 1 个节点。" }, { status: 400 });
    }

    const crossLinkCount = graph.edges.filter((edge) => edge.label && !["包含", "属于"].includes(edge.label)).length;
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("concept_maps").insert({
      user_id: user.id,
      task_id: "pretest_knowledge_graph",
      graph_json: graph,
      node_count: graph.nodes.length,
      edge_count: graph.edges.length,
      cross_link_count: crossLinkCount,
      started_at: graph.startedAt || null
    });

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存知识图谱失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
