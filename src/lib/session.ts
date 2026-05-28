import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { SessionUser, UserProfile } from "@/lib/types";

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "colab_session";
const SESSION_DAYS = 7;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("app_sessions").insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt
  });

  if (error) throw error;
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
    path: "/"
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const supabase = getSupabaseAdmin();
  const tokenHash = hashToken(token);
  const { data: session, error } = await supabase
    .from("app_sessions")
    .select("id,user_id,expires_at")
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !session) return null;

  const { data: user, error: userError } = await supabase
    .from("users_profile")
    .select("id,username,anonymous_code,class_type,role,must_change_password")
    .eq("id", session.user_id)
    .maybeSingle<UserProfile>();

  if (userError || !user) return null;

  await supabase.from("app_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", session.id);

  return {
    ...user,
    session_id: session.id
  };
}

export async function requireSession() {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }
  return user;
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const supabase = getSupabaseAdmin();
    await supabase.from("app_sessions").delete().eq("token_hash", hashToken(token));
  }
  await clearSessionCookie();
}
