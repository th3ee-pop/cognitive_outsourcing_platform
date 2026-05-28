import { NextResponse } from "next/server";
import { comparePassword, hashPassword, validatePassword } from "@/lib/password";
import { getSessionUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

    const { currentPassword, newPassword, confirmPassword } = await request.json();
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "请完整填写密码信息。" }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "两次输入的新密码不一致。" }, { status: 400 });
    }
    const validationError = validatePassword(String(newPassword));
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: row, error: rowError } = await supabase
      .from("users_profile")
      .select("password_hash")
      .eq("id", user.id)
      .maybeSingle();

    if (rowError || !row) {
      return NextResponse.json({ error: "无法读取账号信息。" }, { status: 500 });
    }

    const valid = await comparePassword(String(currentPassword), row.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "当前密码不正确。" }, { status: 400 });
    }

    const passwordHash = await hashPassword(String(newPassword));
    const { error } = await supabase
      .from("users_profile")
      .update({
        password_hash: passwordHash,
        must_change_password: false,
        password_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "修改密码失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
