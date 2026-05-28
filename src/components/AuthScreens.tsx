"use client";

import { ArrowRight, KeyRound, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

function AuthShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(420px, 0.92fr) 1.08fr",
        background: "var(--bg)",
        color: "var(--fg)"
      }}
    >
      <section style={{ padding: "48px 56px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              display: "grid",
              placeItems: "center",
              color: "#fff",
              background: "linear-gradient(135deg, var(--accent), var(--accent-deep))"
            }}
          >
            <KeyRound size={18} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>学习科学实验台</div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", letterSpacing: "0.08em" }}>
              LSRL · v0.1
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: "grid", alignItems: "center" }}>
          <div style={{ maxWidth: 420 }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.18em" }}>
              COGNITIVE OUTSOURCING STUDY
            </div>
            <h1 style={{ margin: "12px 0 8px", fontSize: 32, lineHeight: 1.22, fontWeight: 650 }}>{title}</h1>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14.5, lineHeight: 1.75 }}>{subtitle}</p>
            <div style={{ marginTop: 28 }}>{children}</div>
          </div>
        </div>
      </section>

      <section className="dot-grid" style={{ borderLeft: "1px solid var(--border)", padding: 56, position: "relative" }}>
        <div
          className="panel"
          style={{
            width: "100%",
            height: "100%",
            minHeight: 560,
            padding: 28,
            display: "grid",
            gridTemplateRows: "auto 1fr auto",
            overflow: "hidden"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", letterSpacing: "0.16em" }}>
                RESEARCH FLOW
              </div>
              <div style={{ fontWeight: 650, marginTop: 4 }}>前测与过程数据采集</div>
            </div>
            <div className="mono" style={{ fontSize: 12, color: "var(--accent-deep)", padding: "6px 10px", background: "var(--accent-soft)", borderRadius: 999 }}>
              2026-S
            </div>
          </div>

          <div style={{ display: "grid", alignContent: "center", gap: 12 }}>
            {["CTS 计算思维前测", "先验知识图谱绘制", "系统内 AI 互动记录", "系统外 AI 使用披露"].map((item, index) => (
              <div
                key={item}
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr auto",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  background: index === 0 ? "var(--accent-soft)" : "#fff"
                }}
              >
                <div
                  className="mono"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    display: "grid",
                    placeItems: "center",
                    color: index === 0 ? "#fff" : "var(--muted)",
                    background: index === 0 ? "var(--accent)" : "var(--bg)",
                    border: index === 0 ? "none" : "1px solid var(--border)",
                    fontSize: 11
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{item}</div>
                <ArrowRight size={15} color="var(--muted)" />
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, color: "var(--muted)", fontSize: 12.5, lineHeight: 1.7 }}>
            所有过程数据仅用于研究分析。首次登录需修改初始密码，以避免误登他人账号造成数据混淆。
          </div>
        </div>
      </section>
    </main>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password")
      })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "登录失败。");
      return;
    }
    router.push(data.mustChangePassword ? "/change-password" : "/lab");
  }

  return (
    <AuthShell title="进入研究数据采集系统" subtitle="请使用教师分配的账号登录。所有账号初始密码均为 123456，首次登录后必须修改。">
      <form onSubmit={onSubmit} className="panel" style={{ padding: 22, display: "grid", gap: 14 }}>
        <div>
          <label className="label" htmlFor="username">
            用户名
          </label>
          <input className="field" id="username" name="username" autoComplete="username" placeholder="例如 grad01 / under01" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            密码
          </label>
          <input className="field" id="password" name="password" type="password" autoComplete="current-password" placeholder="初始密码 123456" />
        </div>
        {error && <div className="message-error">{error}</div>}
        <button className="primary-btn" disabled={loading} type="submit">
          <LogIn size={16} />
          {loading ? "正在登录" : "登录"}
        </button>
      </form>
    </AuthShell>
  );
}

export function ChangePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setOk("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        newPassword: form.get("newPassword"),
        confirmPassword: form.get("confirmPassword")
      })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "修改密码失败。");
      return;
    }
    setOk("密码已更新，正在进入系统。");
    router.push("/lab");
  }

  return (
    <AuthShell title="首次登录需要修改密码" subtitle="新密码需同时包含字母和数字，长度不少于 8 位。此步骤用于避免学生误登他人账号并改动他人数据。">
      <form onSubmit={onSubmit} className="panel" style={{ padding: 22, display: "grid", gap: 14 }}>
        <div>
          <label className="label" htmlFor="currentPassword">
            当前密码
          </label>
          <input className="field" id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" placeholder="请输入当前密码" />
        </div>
        <div>
          <label className="label" htmlFor="newPassword">
            新密码
          </label>
          <input className="field" id="newPassword" name="newPassword" type="password" autoComplete="new-password" placeholder="至少 8 位，包含字母和数字" />
        </div>
        <div>
          <label className="label" htmlFor="confirmPassword">
            二次确认
          </label>
          <input className="field" id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" placeholder="再次输入新密码" />
        </div>
        {error && <div className="message-error">{error}</div>}
        {ok && <div className="message-ok">{ok}</div>}
        <button className="primary-btn" disabled={loading} type="submit">
          <KeyRound size={16} />
          {loading ? "正在保存" : "修改密码并进入"}
        </button>
      </form>
    </AuthShell>
  );
}
