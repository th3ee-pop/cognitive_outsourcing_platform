"use client";

import {
  BarChart3,
  Bot,
  Check,
  Database,
  Download,
  FileText,
  GitBranch,
  Home,
  Lock,
  LogOut,
  Plus,
  Save,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AiChatModule } from "@/components/AiChatModule";
import { ctsItems, likertLabels, scoreCts } from "@/data/cts";
import type { ConceptEdge, ConceptNode, ExternalAiDisclosure, SessionUser } from "@/lib/types";

type ModuleId = "home" | "survey" | "graph" | "ai" | "external" | "records" | "admin";

const navItems: Array<{ id: ModuleId; label: string; sub: string; icon: React.ElementType; disabled?: boolean; adminOnly?: boolean }> = [
  { id: "home", label: "任务说明", sub: "Overview", icon: Home },
  { id: "survey", label: "CTS 前测", sub: "Questionnaire", icon: FileText },
  { id: "graph", label: "知识图谱", sub: "Knowledge graph", icon: GitBranch },
  { id: "ai", label: "AI 对话", sub: "Chat", icon: Bot },
  { id: "external", label: "AI 披露", sub: "Disclosure", icon: ShieldCheck },
  { id: "records", label: "我的记录", sub: "Records", icon: Database },
  { id: "admin", label: "管理后台", sub: "Export", icon: BarChart3, adminOnly: true }
];

const seedNodes: ConceptNode[] = [
  { id: "central", label: "认知外包", kind: "central", x: 420, y: 260 },
  { id: "n1", label: "先验知识", kind: "concept", x: 210, y: 150 },
  { id: "n2", label: "知识结构", kind: "concept", x: 640, y: 150 },
  { id: "n3", label: "计算思维", kind: "support", x: 230, y: 410 },
  { id: "n4", label: "AI 互动模式", kind: "support", x: 620, y: 420 }
];

const seedEdges: ConceptEdge[] = [
  { id: "e1", source: "central", target: "n1", label: "受影响于" },
  { id: "e2", source: "central", target: "n2", label: "体现为" },
  { id: "e3", source: "central", target: "n3", label: "需要" },
  { id: "e4", source: "central", target: "n4", label: "通过" }
];

function classLabel(value: SessionUser["class_type"]) {
  if (value === "graduate") return "研究生班级";
  if (value === "undergraduate") return "本科生班级";
  return "研究者账号";
}

export function LabApp({ user }: { user: SessionUser }) {
  const visibleNav = navItems.filter((item) => !item.adminOnly || ["teacher", "admin"].includes(user.role));
  const [active, setActive] = useState<ModuleId>("home");
  const activeItem = visibleNav.find((item) => item.id === active) ?? visibleNav[0];
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const compact = useCompact();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const progress = Math.round((Object.values(completed).filter(Boolean).length / 4) * 100);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: compact ? "76px minmax(0, 1fr)" : "232px 1fr",
        gridTemplateRows: "60px 1fr",
        background: "var(--bg)",
        color: "var(--fg)"
      }}
    >
      <aside
        style={{
          gridRow: "1 / -1",
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          padding: compact ? "18px 8px" : "20px 14px",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: compact ? "center" : "flex-start", gap: 10, padding: compact ? "4px 0 24px" : "6px 6px 22px" }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              display: "grid",
              placeItems: "center",
              color: "#fff",
              background: "linear-gradient(135deg, var(--accent), var(--accent-deep))"
            }}
          >
            <Sparkles size={17} />
          </div>
          {!compact && <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>学习科学实验台</div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", letterSpacing: "0.06em" }}>
              LSRL · v0.1
            </div>
          </div>}
        </div>

        {!compact && <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", letterSpacing: "0.16em", padding: "8px 8px 10px" }}>
          实验流程 · MODULES
        </div>}

        <nav style={{ display: "grid", gap: 2 }}>
          {visibleNav.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.id === active;
            const isDone = completed[item.id];
            return (
              <button
                key={item.id}
                disabled={item.disabled}
                onClick={() => !item.disabled && setActive(item.id)}
                style={{
                  position: "relative",
                  display: "grid",
                  gridTemplateColumns: compact ? "1fr" : "28px 1fr auto",
                  alignItems: "center",
                  gap: 12,
                  minHeight: 48,
                  padding: "10px",
                  border: 0,
                  borderRadius: 9,
                  background: isActive ? "var(--accent-soft)" : "transparent",
                  color: item.disabled ? "color-mix(in oklch, var(--muted) 55%, transparent)" : isActive ? "var(--accent-deep)" : "var(--fg)",
                  textAlign: "left",
                  justifyItems: compact ? "center" : "stretch"
                }}
              >
                {isActive && <span style={{ position: "absolute", left: -14, top: 8, bottom: 8, width: 2, borderRadius: 2, background: "var(--accent)" }} />}
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    display: "grid",
                    placeItems: "center",
                    background: isActive ? "var(--accent)" : "transparent",
                    color: isActive ? "#fff" : "var(--muted)",
                    border: isActive ? "none" : "1px solid var(--border)"
                  }}
                >
                  <Icon size={15} />
                </span>
                {!compact && <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: isActive ? 700 : 600 }}>{item.label}</span>
                  <span className="mono" style={{ display: "block", marginTop: 2, fontSize: 10.5, color: "var(--muted)", letterSpacing: "0.04em" }}>
                    {String(index + 1).padStart(2, "0")} · {item.sub}
                  </span>
                </span>}
                {!compact && (item.disabled ? <Lock size={14} /> : isDone ? <Check size={14} /> : null)}
              </button>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />
        {!compact && <div className="panel" style={{ padding: 14, background: "var(--subtle)" }}>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", letterSpacing: "0.12em", marginBottom: 6 }}>
            会话 · SESSION
          </div>
          <div className="mono" style={{ fontSize: 19, color: "var(--fg)", fontWeight: 600 }}>
            {user.anonymous_code}
          </div>
          <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--muted)", lineHeight: 1.55 }}>
            {classLabel(user.class_type)} · 数据自动保存到研究编号。
          </div>
        </div>}
      </aside>

      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: compact ? "0 12px" : "0 28px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)"
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--muted)" }}>
            MODULE · {activeItem.sub.toUpperCase()}
          </div>
          <div style={{ marginTop: 2, fontSize: 15, fontWeight: 600 }}>
            {activeItem.label} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {activeItem.sub}</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {!compact && <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--subtle)" }}>
          <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
            研究进度
          </span>
          <span style={{ width: 110, height: 4, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
            <span style={{ display: "block", width: `${progress}%`, height: "100%", background: "var(--accent)" }} />
          </span>
          <span className="mono" style={{ fontSize: 12 }}>
            {progress}%
          </span>
        </div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 12px 5px 5px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--subtle)" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 700 }}>
            {user.anonymous_code.slice(0, 1)}
          </div>
          {!compact && <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>参与者 · {user.anonymous_code}</div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)" }}>
              {user.username}
            </div>
          </div>}
        </div>
        <button className="icon-btn" onClick={logout} title="退出登录">
          <LogOut size={16} />
        </button>
      </header>

      <main style={{ overflow: "hidden", minWidth: 0 }}>
        {active === "home" && <Overview user={user} setActive={setActive} compact={compact} />}
        {active === "survey" && <SurveyModule compact={compact} markDone={() => setCompleted((prev) => ({ ...prev, survey: true }))} />}
        {active === "graph" && <GraphModule compact={compact} markDone={() => setCompleted((prev) => ({ ...prev, graph: true }))} />}
        {active === "ai" && <AiChatModule compact={compact} markDone={() => setCompleted((prev) => ({ ...prev, ai: true }))} />}
        {active === "external" && <ExternalAiModule markDone={() => setCompleted((prev) => ({ ...prev, external: true }))} />}
        {active === "records" && <RecordsModule completed={completed} />}
        {active === "admin" && <AdminModule />}
      </main>
    </div>
  );
}

function useCompact() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const update = () => setCompact(window.innerWidth < 760);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return compact;
}

function Overview({ user, setActive, compact }: { user: SessionUser; setActive: (id: ModuleId) => void; compact: boolean }) {
  return (
    <section style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 340px", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: compact ? "28px 22px" : "42px 56px", overflow: "auto" }}>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.18em" }}>
          STEP 00 · 研究任务说明
        </div>
        <h1 style={{ margin: "10px 0 6px", fontSize: 30, lineHeight: 1.2, fontWeight: 650 }}>认知外包过程数据采集</h1>
        <p style={{ margin: "0 0 22px", color: "var(--muted)", fontSize: 14.5 }}>系统用于收集前测、知识结构、AI 互动与系统外 AI 使用披露，不承接最终大作业提交与评分。</p>
        <div className="panel" style={{ padding: 24, display: "grid", gap: 18 }}>
          {[
            ["前测数据", "完成 CTS 计算思维量表，系统保存原始题项与维度得分。"],
            ["知识结构", "绘制你对研究主题相关概念的先验理解，系统记录节点、边、关系标签与图谱 JSON。"],
            ["AI 互动", "在系统内新建、归档并持续留存 AI 对话，系统记录完整互动文本与复制行为。"],
            ["补充披露", "如使用系统外 AI，请记录工具名称、使用环节、提示语摘要与采纳方式。"]
          ].map(([title, body]) => (
            <div key={title} style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "116px 1fr", gap: compact ? 6 : 18, paddingBottom: 14, borderBottom: "1px dashed var(--border)" }}>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.12em" }}>
                {title}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.75 }}>{body}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
          <button className="primary-btn" onClick={() => setActive("survey")}>
            开始 CTS 前测
          </button>
          <button className="ghost-btn" onClick={() => setActive("graph")}>
            进入知识图谱
          </button>
        </div>
      </div>
      {!compact && <aside style={{ borderLeft: "1px solid var(--border)", background: "var(--subtle)", padding: "40px 32px", display: "grid", alignContent: "start", gap: 22 }}>
        <Meta label="参与编号" value={user.anonymous_code} large />
        <Meta label="账号" value={user.username} />
        <Meta label="班级" value={classLabel(user.class_type)} />
        <Meta label="权限" value={user.role} />
      </aside>}
    </section>
  );
}

function Meta({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", letterSpacing: "0.14em", marginBottom: 4 }}>
        {label}
      </div>
      <div className={large ? "mono" : undefined} style={{ fontSize: large ? 22 : 14, fontWeight: large ? 700 : 600 }}>
        {value}
      </div>
    </div>
  );
}

function SurveyModule({ compact, markDone }: { compact: boolean; markDone: () => void }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const scores = useMemo(() => scoreCts(answers), [answers]);

  async function submit() {
    setMessage("");
    setError("");
    const res = await fetch("/api/survey/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "提交失败。");
      return;
    }
    markDone();
    setMessage(`已提交。总分 ${data.scores.total}，均分 ${data.scores.mean}。`);
  }

  return (
    <section style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "236px 1fr", height: "100%" }}>
      {!compact && <aside style={{ borderRight: "1px solid var(--border)", padding: "32px 22px", background: "var(--subtle)" }}>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", letterSpacing: "0.14em", marginBottom: 14 }}>
          量表 · SCALES
        </div>
        <div className="panel" style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", display: "grid", placeItems: "center", color: "#fff", background: "var(--accent)" }}>
              <Check size={11} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>CTS 计算思维</div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>
                {ctsItems.length} 题 · 5 点量表
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 18, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.7 }}>
          当前版本只开放 CTS。后续如需扩展 AI 素养或认知负荷量表，可在代码层面添加。
        </div>
      </aside>}
      <div style={{ padding: compact ? "26px 18px" : "36px 56px", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.18em" }}>
              SCALE · CTS
            </div>
            <h2 style={{ fontSize: 22, margin: "6px 0 4px" }}>计算思维前测量表</h2>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>请根据自己的真实情况作答，无对错之分。</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
              {Object.keys(answers).length} / {ctsItems.length} 完成
            </div>
            <div style={{ width: 140, height: 4, background: "var(--border)", borderRadius: 4 }}>
              <div style={{ width: `${(Object.keys(answers).length / ctsItems.length) * 100}%`, height: "100%", background: "var(--accent)", borderRadius: 4 }} />
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {ctsItems.map((item, index) => (
            <div key={item.id} className="panel" style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: compact ? "28px 1fr" : "32px 1fr auto", gap: compact ? 12 : 18, alignItems: "center" }}>
              <div className="mono" style={{ color: "var(--muted)", fontSize: 11.5 }}>
                {String(index + 1).padStart(2, "0")}
              </div>
              <div>
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>{item.text}</div>
                <div className="mono" style={{ marginTop: 4, fontSize: 10.5, color: "var(--muted)", letterSpacing: "0.08em" }}>
                  {item.dimension}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, gridColumn: compact ? "2 / -1" : "auto", flexWrap: "wrap" }}>
                {likertLabels.map((label, i) => {
                  const value = i + 1;
                  const selected = answers[item.id] === value;
                  return (
                    <button
                      key={label}
                      title={label}
                      onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: value }))}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        border: `1.5px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                        background: selected ? "var(--accent)" : "var(--bg)",
                        color: selected ? "#fff" : "var(--muted)",
                        fontWeight: 700
                      }}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ position: "sticky", bottom: 0, marginTop: 16, padding: "14px 0", background: "linear-gradient(transparent, var(--bg) 20%)", display: "flex", alignItems: "center", gap: 12 }}>
          <button className="primary-btn" onClick={submit}>
            <Save size={15} />
            提交量表
          </button>
          <div className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>
            当前估算均分 {scores.mean}
          </div>
          {message && <div className="message-ok">{message}</div>}
          {error && <div className="message-error">{error}</div>}
        </div>
      </div>
    </section>
  );
}

function GraphModule({ compact, markDone }: { compact: boolean; markDone: () => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [nodes, setNodes] = useState(seedNodes);
  const [edges, setEdges] = useState(seedEdges);
  const [selected, setSelected] = useState("central");
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selectedNode = nodes.find((node) => node.id === selected) ?? nodes[0];

  function clientToSvgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const transformed = point.matrixTransform(svg.getScreenCTM()?.inverse());
    return {
      x: Math.min(860, Math.max(40, transformed.x)),
      y: Math.min(520, Math.max(40, transformed.y))
    };
  }

  function startDrag(event: React.PointerEvent<SVGGElement>, node: ConceptNode) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = clientToSvgPoint(event.clientX, event.clientY);
    setSelected(node.id);
    setDragging({ id: node.id, offsetX: point.x - node.x, offsetY: point.y - node.y });
  }

  function dragNode(event: React.PointerEvent<SVGSVGElement>) {
    if (!dragging) return;
    const point = clientToSvgPoint(event.clientX, event.clientY);
    setNodes((prev) =>
      prev.map((node) =>
        node.id === dragging.id
          ? {
              ...node,
              x: Math.round(point.x - dragging.offsetX),
              y: Math.round(point.y - dragging.offsetY)
            }
          : node
      )
    );
  }

  function stopDrag() {
    setDragging(null);
  }

  function addNode() {
    const next = nodes.length + 1;
    setNodes((prev) => [
      ...prev,
      { id: `n${Date.now()}`, label: `新概念 ${next}`, kind: "leaf", x: 140 + ((next * 91) % 620), y: 110 + ((next * 67) % 360) }
    ]);
  }

  function addEdge() {
    if (nodes.length < 2) return;
    const target = nodes.find((node) => node.id !== selectedNode.id) ?? nodes[0];
    setEdges((prev) => [...prev, { id: `e${Date.now()}`, source: selectedNode.id, target: target.id, label: "影响" }]);
  }

  async function submit() {
    setMessage("");
    setError("");
    const res = await fetch("/api/concept-map/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodes, edges, startedAt: new Date().toISOString() })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "保存失败。");
      return;
    }
    markDone();
    setMessage("知识图谱已保存。");
  }

  return (
    <section style={{ display: "grid", gridTemplateColumns: compact ? "52px minmax(0, 1fr)" : "64px minmax(0, 1fr) 320px", height: "100%" }}>
      <aside style={{ borderRight: "1px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0", gap: 6 }}>
        <ToolButton icon={Plus} label="节点" onClick={addNode} active />
        <ToolButton icon={GitBranch} label="连线" onClick={addEdge} />
        <ToolButton icon={Save} label="保存" onClick={submit} />
        <div style={{ flex: 1 }} />
        <div className="mono" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 9.5, color: "var(--muted)", letterSpacing: "0.1em" }}>
          NODES · {nodes.length}
        </div>
      </aside>
      <div className="dot-grid" style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 18, left: 24, right: 24, zIndex: 2, display: "flex", alignItems: "center", gap: 14 }}>
          <div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.18em" }}>
              TASK · CONSTRUCT
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>请绘制你对研究主题的先验知识结构</div>
          </div>
          <div style={{ flex: 1 }} />
          <div className="mono" style={{ padding: "5px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", fontSize: 11.5, color: "var(--muted)" }}>
            自动保存 · 待接入
          </div>
        </div>
        <svg
          ref={svgRef}
          viewBox="0 0 900 560"
          onPointerMove={dragNode}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          style={{ width: "100%", height: "100%", touchAction: "none", userSelect: "none" }}
        >
          {edges.map((edge) => {
            const source = nodes.find((node) => node.id === edge.source);
            const target = nodes.find((node) => node.id === edge.target);
            if (!source || !target) return null;
            return (
              <g key={edge.id}>
                <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="var(--edge)" strokeWidth="1.6" />
                <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">
                  {edge.label}
                </text>
              </g>
            );
          })}
          {nodes.map((node) => {
            const isSelected = node.id === selected;
            const central = node.kind === "central";
            return (
              <g
                key={node.id}
                onPointerDown={(event) => startDrag(event, node)}
                style={{ cursor: dragging?.id === node.id ? "grabbing" : "grab" }}
              >
                {isSelected && <circle cx={node.x} cy={node.y} r={central ? 44 : 34} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 3" />}
                <circle cx={node.x} cy={node.y} r={central ? 36 : 27} fill={central ? "var(--accent)" : node.kind === "concept" ? "var(--accent-soft)" : "var(--surface)"} stroke={central ? "var(--accent-deep)" : "var(--accent)"} strokeWidth="1.5" />
                <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize={central ? 14 : 12} fill={central ? "#fff" : "var(--accent-deep)"} fontWeight="650">
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {!compact && <aside style={{ borderLeft: "1px solid var(--border)", background: "var(--subtle)", padding: 16 }}>
        <div className="panel" style={{ padding: "22px 20px", display: "grid", alignContent: "start", gap: 18, minHeight: "calc(100vh - 92px)" }}>
          <div>
            <label className="label">选中节点 · SELECTED</label>
            <input className="field" value={selectedNode.label} onChange={(event) => setNodes((prev) => prev.map((node) => (node.id === selectedNode.id ? { ...node, label: event.target.value } : node)))} />
          </div>
          <div>
            <label className="label">节点类型</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["central", "concept", "support", "leaf"] as ConceptNode["kind"][]).map((kind) => (
                <button key={kind} className={selectedNode.kind === kind ? "soft-btn" : "ghost-btn"} onClick={() => setNodes((prev) => prev.map((node) => (node.id === selectedNode.id ? { ...node, kind } : node)))} style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }}>
                  {kind}
                </button>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <label className="label">图谱概览</label>
            <Stat label="节点" value={String(nodes.length)} />
            <Stat label="边" value={String(edges.length)} />
            <Stat label="横向连接" value={String(edges.filter((edge) => edge.label !== "包含").length)} />
          </div>
          {message && <div className="message-ok">{message}</div>}
          {error && <div className="message-error">{error}</div>}
        </div>
      </aside>}
    </section>
  );
}

function ToolButton({ icon: Icon, label, onClick, active }: { icon: React.ElementType; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button title={label} onClick={onClick} style={{ width: 40, height: 40, borderRadius: 9, border: active ? "1px solid color-mix(in oklch, var(--accent) 35%, transparent)" : "1px solid transparent", background: active ? "var(--accent-soft)" : "transparent", color: active ? "var(--accent-deep)" : "var(--muted)", display: "grid", placeItems: "center" }}>
      <Icon size={17} />
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "7px 0", borderBottom: "1px dashed var(--border)" }}>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>{label}</div>
      <div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}

function ExternalAiModule({ markDone }: { markDone: () => void }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setMessage("");
    setError("");
    const res = await fetch("/api/external-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData))
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "提交失败。");
      return;
    }
    markDone();
    setMessage("披露记录已保存。");
  }

  return (
    <section style={{ padding: "38px 56px", overflow: "auto", height: "100%" }}>
      <div className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.18em" }}>
        DISCLOSURE · EXTERNAL AI
      </div>
      <h2 style={{ fontSize: 24, margin: "8px 0 4px" }}>系统外 AI 使用披露</h2>
      <p style={{ margin: "0 0 22px", color: "var(--muted)", fontSize: 14 }}>如果你在系统外使用了其他 AI 工具，请补充说明，便于后续解释过程数据。</p>
      <form action={submit} className="panel" style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 920 }}>
        <div>
          <label className="label">工具名称</label>
          <input className="field" name="tool_name" placeholder="例如 ChatGPT / Kimi / 通义" />
        </div>
        <div>
          <label className="label">使用环节</label>
          <select className="field" name="usage_stage" defaultValue="任务理解与拆解">
            {["任务理解与拆解", "资料查找", "数据理解", "分析方法选择", "可视化设计", "结果解释", "报告表达", "结果检查与修正", "其他"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="label">关键提示语摘要</label>
          <textarea className="field" name="prompt_summary" rows={4} placeholder="概述你向系统外 AI 提出的关键问题或提示语。" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="label">采纳方式</label>
          <textarea className="field" name="adoption_description" rows={4} placeholder="说明你如何采纳、修改或拒绝了 AI 输出。" />
        </div>
        <div>
          <label className="label">大致时间</label>
          <input className="field" name="approximate_time" placeholder="例如 第 2 周 / 5 月 28 日晚" />
        </div>
        <div style={{ alignSelf: "end", display: "flex", alignItems: "center", gap: 12 }}>
          <button className="primary-btn" type="submit">
            <Save size={15} /> 保存披露
          </button>
          {message && <span className="message-ok">{message}</span>}
          {error && <span className="message-error">{error}</span>}
        </div>
      </form>
    </section>
  );
}

function RecordsModule({ completed }: { completed: Record<string, boolean> }) {
  const rows = [
    ["CTS 前测", completed.survey ? "已提交" : "未提交"],
    ["知识图谱", completed.graph ? "已保存" : "未保存"],
    ["AI 对话", completed.ai ? "已有互动记录" : "可新建对话"],
    ["系统外 AI 披露", completed.external ? "已提交记录" : "可选补充"]
  ];
  return (
    <section style={{ padding: "38px 56px", height: "100%", overflow: "auto" }}>
      <h2 style={{ margin: "0 0 18px", fontSize: 24 }}>我的记录</h2>
      <div className="panel" style={{ maxWidth: 780, overflow: "hidden" }}>
        {rows.map(([name, state]) => (
          <div key={name} style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "16px 20px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
            <div style={{ fontWeight: 650 }}>{name}</div>
            <div className="mono" style={{ fontSize: 12, color: state.includes("已") ? "var(--success)" : "var(--muted)" }}>
              {state}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminModule() {
  async function exportData() {
    const res = await fetch("/api/admin/export");
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cognitive-outsourcing-export-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section style={{ padding: "38px 56px" }}>
      <div className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.18em" }}>
        ADMIN · EXPORT
      </div>
      <h2 style={{ margin: "8px 0 4px", fontSize: 24 }}>管理后台</h2>
      <p style={{ margin: "0 0 22px", color: "var(--muted)" }}>第一版聚焦数据导出，不提供班级创建与维护功能。</p>
      <button className="primary-btn" onClick={exportData}>
        <Download size={15} /> 导出研究数据 JSON
      </button>
    </section>
  );
}
