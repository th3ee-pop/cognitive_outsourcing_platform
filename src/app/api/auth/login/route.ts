import { NextResponse } from "next/server";
import { comparePassword } from "@/lib/password";
import { createSession, setSessionCookie } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: "请输入用户名和密码。" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: user, error } = await supabase
      .from("users_profile")
      .select("id,username,anonymous_code,class_type,role,must_change_password,password_hash")
      .eq("username", String(username).trim())
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ error: "用户名或密码不正确。" }, { status: 401 });
    }

    const valid = await comparePassword(String(password), user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "用户名或密码不正确。" }, { status: 401 });
    }

    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);

    return NextResponse.json({
      ok: true,
      mustChangePassword: user.must_change_password,
      user: {
        id: user.id,
        username: user.username,
        anonymous_code: user.anonymous_code,
        class_type: user.class_type,
        role: user.role
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "登录失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
