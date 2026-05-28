# Cognitive Outsourcing Learning Lab

认知外包学习实验平台，用于支持研究中的前测与过程性数据采集。平台当前定位不是 LMS，也不承接最终大作业提交或在线评分；它主要服务于研究过程数据的稳定采集、账号隔离与后续导出分析。

## 功能概览

- 预置账号登录：研究生账号 `grad01` 至 `grad25`，本科生账号 `under01` 至 `under30`，另有 `teacher01` 与 `admin01`。
- 首次登录强制改密：所有账号初始密码为 `123456`，首次登录必须修改；新密码需包含字母和数字，长度不少于 8 位，并需要二次确认。
- CTS 计算思维前测：内置 CTS 题项，提交后保存原始作答与维度得分。
- 知识图谱采集：学生可编辑概念节点、关系边和关系标签，提交后保存图谱 JSON、节点数、边数和横向连接数。
- AI 智能体入口：第一版为置灰锁定状态，正式任务开放后可继续扩展为系统内 AI 对话采集。
- 系统外 AI 使用披露：记录工具名称、使用环节、关键提示语摘要、采纳方式和大致时间。
- 我的记录：学生可查看当前会话内的提交状态。
- 管理导出：教师或管理员可导出研究数据 JSON。

## 技术栈

- Next.js App Router
- React
- TypeScript
- Supabase PostgreSQL
- Supabase JS client
- bcryptjs
- lucide-react

## 快速启动

安装依赖：

```bash
npm install
```

创建本地环境变量：

```bash
cp .env.example .env.local
```

填写 `.env.local`：

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SESSION_COOKIE_NAME=colab_session
```

启动开发服务器：

```bash
npm run dev
```

访问：

```text
http://localhost:3000/login
```

构建检查：

```bash
npm run build
```

## 工程结构

```text
.
├── .env.example
├── .gitignore
├── next.config.ts
├── package.json
├── package-lock.json
├── tsconfig.json
├── src
│   ├── app
│   │   ├── api
│   │   │   ├── admin/export/route.ts
│   │   │   ├── auth/change-password/route.ts
│   │   │   ├── auth/login/route.ts
│   │   │   ├── auth/logout/route.ts
│   │   │   ├── concept-map/submit/route.ts
│   │   │   ├── external-ai/route.ts
│   │   │   └── survey/submit/route.ts
│   │   ├── change-password/page.tsx
│   │   ├── globals.css
│   │   ├── lab/page.tsx
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── page.tsx
│   ├── components
│   │   ├── AuthScreens.tsx
│   │   └── LabApp.tsx
│   ├── data
│   │   └── cts.ts
│   └── lib
│       ├── password.ts
│       ├── session.ts
│       ├── supabaseAdmin.ts
│       └── types.ts
└── supabase
    └── init_cognitive_outsourcing_lab.sql
```

## Next.js 页面

- `src/app/page.tsx`：根入口，根据登录状态跳转到 `/login`、`/change-password` 或 `/lab`。
- `src/app/login/page.tsx`：登录页。
- `src/app/change-password/page.tsx`：首次登录修改密码页。
- `src/app/lab/page.tsx`：实验平台主界面，要求已登录且已完成首次改密。
- `src/app/layout.tsx`：全局 HTML 结构和 metadata。
- `src/app/globals.css`：全局视觉变量、按钮、表单、面板、点阵背景等基础样式。

## Next.js API 路由

以下文件均为 Next.js Route Handler，位于 `src/app/api/**/route.ts`：

- `api/auth/login`：用户名和密码登录；登录成功后写入 HTTP-only session cookie。
- `api/auth/logout`：删除当前会话并清除 cookie。
- `api/auth/change-password`：校验当前密码、新密码规则与二次确认后更新密码，并关闭 `must_change_password`。
- `api/survey/submit`：提交 CTS 前测，保存题项作答与得分。
- `api/concept-map/submit`：提交知识图谱，保存图谱 JSON 与结构指标。
- `api/external-ai`：`GET` 获取当前用户系统外 AI 披露记录；`POST` 新增披露记录。
- `api/admin/export`：教师和管理员导出用户、前测、图谱、披露和行为事件数据。

这些 API 通过 `src/lib/session.ts` 获取当前用户，通过 `src/lib/supabaseAdmin.ts` 创建服务端 Supabase client。密钥必须只存在服务端环境变量中，不要提交 `.env.local`。

## 前端组件

- `src/components/AuthScreens.tsx`：登录页和首次改密页的界面组件。
- `src/components/LabApp.tsx`：实验平台主界面，包括左侧导航、顶部状态栏、任务说明、CTS 前测、知识图谱、AI 置灰页、AI 披露、我的记录和管理导出。
- `src/data/cts.ts`：CTS 题项、Likert 选项和前测计分函数。

## 服务端工具

- `src/lib/password.ts`：密码复杂度校验、哈希和比对。
- `src/lib/session.ts`：自定义 session token 创建、读取、删除与 cookie 管理。
- `src/lib/supabaseAdmin.ts`：服务端 Supabase client 初始化。
- `src/lib/types.ts`：用户、图谱、披露等共享类型定义。

## 数据库 Schema 配置

数据库初始化脚本位于：

```text
supabase/init_cognitive_outsourcing_lab.sql
```

该 SQL 用于创建平台所需的 Supabase PostgreSQL 结构，并初始化班级、账号和 CTS 表单记录。

主要数据表：

- `classes`：预置班级。第一版不提供班级创建和维护界面。
- `users_profile`：账号、匿名编号、班级、角色、密码哈希、首次改密状态。
- `app_sessions`：自定义登录 session。
- `survey_forms`：量表元数据。第一版只内置 CTS，但数据结构保留多量表扩展能力。
- `survey_responses`：学生量表作答和得分。
- `concept_maps`：知识图谱 JSON 与结构指标。
- `ai_conversations`：系统内 AI 会话元数据，第一版预留。
- `ai_messages`：系统内 AI 消息，第一版预留。
- `behavior_events`：行为埋点事件，第一版预留。
- `external_ai_disclosures`：系统外 AI 使用披露。
- `offline_outcome_scores`：线下评分结果导入预留表。

初始化账号：

- 研究生：`grad01` 至 `grad25`
- 本科生：`under01` 至 `under30`
- 教师：`teacher01`
- 管理员：`admin01`

所有账号初始密码均为 `123456`，首次登录后必须修改。

## 安全说明

- `.env.local` 已被 `.gitignore` 忽略，不应提交。
- `SUPABASE_SERVICE_ROLE_KEY` 只能用于服务端，不要暴露给浏览器。
- 用户密码不明文保存，数据库中保存哈希。
- 学生账号只能通过应用流程读写自己的数据。
- 管理导出接口仅允许 `teacher` 和 `admin` 角色访问。

## 当前限制

- AI 对话模块第一版为置灰状态，尚未接入模型 API。
- “我的记录”当前显示本次前端会话中的完成状态，后续可改为从数据库读取历史提交状态。
- 行为埋点表已预留，前端尚未系统性写入所有事件。
- 最终作品 PDF/Word 不由本平台提交或评分，后续分析可通过匿名编号与线下评分结果合并。
