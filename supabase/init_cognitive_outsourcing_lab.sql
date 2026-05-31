create extension if not exists pgcrypto;

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  class_type text not null unique check (class_type in ('graduate', 'undergraduate')),
  name text not null,
  capacity integer not null check (capacity > 0),
  username_prefix text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.users_profile (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  anonymous_code text not null unique,
  class_id uuid references public.classes(id),
  class_type text check (class_type in ('graduate', 'undergraduate')),
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  password_hash text not null,
  must_change_password boolean not null default true,
  password_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.survey_forms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  schema_json jsonb not null default '{}'::jsonb,
  scoring_config jsonb not null default '{}'::jsonb,
  target_class text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(id) on delete cascade,
  survey_id uuid references public.survey_forms(id),
  answers_json jsonb not null,
  scores_json jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  unique (user_id, survey_id)
);

create table if not exists public.concept_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(id) on delete cascade,
  task_id text not null default 'pretest_knowledge_graph',
  graph_json jsonb not null,
  image_url text,
  node_count integer not null default 0,
  edge_count integer not null default 0,
  cross_link_count integer not null default 0,
  started_at timestamptz,
  submitted_at timestamptz not null default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(id) on delete cascade,
  task_id text not null default 'main_task',
  title text not null,
  task_stage text,
  model text,
  system_prompt_version text,
  archived_at timestamptz,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references public.users_profile(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  token_count integer,
  created_at timestamptz not null default now(),
  metadata_json jsonb not null default '{}'::jsonb
);

create table if not exists public.behavior_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users_profile(id) on delete set null,
  session_id uuid references public.app_sessions(id) on delete set null,
  event_type text not null,
  page text,
  target_type text,
  target_id text,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.external_ai_disclosures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(id) on delete cascade,
  task_id text not null default 'main_task',
  tool_name text not null,
  usage_stage text not null,
  prompt_summary text,
  adoption_description text,
  approximate_time text,
  created_at timestamptz not null default now()
);

create table if not exists public.offline_outcome_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users_profile(id) on delete set null,
  anonymous_code text not null,
  score_json jsonb not null default '{}'::jsonb,
  rater_id text,
  imported_at timestamptz not null default now()
);

alter table public.classes enable row level security;
alter table public.users_profile enable row level security;
alter table public.app_sessions enable row level security;
alter table public.survey_forms enable row level security;
alter table public.survey_responses enable row level security;
alter table public.concept_maps enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.behavior_events enable row level security;
alter table public.external_ai_disclosures enable row level security;
alter table public.offline_outcome_scores enable row level security;

create index if not exists idx_users_profile_username on public.users_profile(username);
create index if not exists idx_users_profile_role on public.users_profile(role);
create index if not exists idx_app_sessions_token_hash on public.app_sessions(token_hash);
create index if not exists idx_survey_responses_user_id on public.survey_responses(user_id);
create index if not exists idx_concept_maps_user_id on public.concept_maps(user_id);
create index if not exists idx_ai_conversations_user_archived_updated on public.ai_conversations(user_id, archived_at, updated_at desc);
create index if not exists idx_ai_conversations_user_last_message on public.ai_conversations(user_id, last_message_at desc);
create index if not exists idx_ai_messages_conversation_created_at on public.ai_messages(conversation_id, created_at);
create index if not exists idx_behavior_events_user_id_created_at on public.behavior_events(user_id, created_at);
create index if not exists idx_external_ai_disclosures_user_id on public.external_ai_disclosures(user_id);

insert into public.classes (class_type, name, capacity, username_prefix)
values
  ('graduate', '研究生班级', 25, 'grad'),
  ('undergraduate', '本科生班级', 30, 'under')
on conflict (class_type) do update set
  name = excluded.name,
  capacity = excluded.capacity,
  username_prefix = excluded.username_prefix;

insert into public.survey_forms (title, description, schema_json, scoring_config, target_class, active)
values (
  'CTS 计算思维前测量表',
  '第一版内置计算思维前测，后续可在代码层面扩展其他量表。',
  '{"scale":"CTS","version":"v1","responseType":"likert_5"}'::jsonb,
  '{"dimensions":["问题分解","抽象概括","算法思维","数据意识","评价调试","迁移应用","协同表达","元认知监控"]}'::jsonb,
  'all',
  true
)
on conflict do nothing;

with grad_class as (
  select id from public.classes where class_type = 'graduate'
), grad_accounts as (
  select generate_series(1, 25) as n
)
insert into public.users_profile (username, anonymous_code, class_id, class_type, role, password_hash, must_change_password)
select
  'grad' || lpad(n::text, 2, '0'),
  'G' || lpad(n::text, 3, '0'),
  grad_class.id,
  'graduate',
  'student',
  crypt('123456', gen_salt('bf', 10)),
  true
from grad_accounts cross join grad_class
on conflict (username) do nothing;

with under_class as (
  select id from public.classes where class_type = 'undergraduate'
), under_accounts as (
  select generate_series(1, 30) as n
)
insert into public.users_profile (username, anonymous_code, class_id, class_type, role, password_hash, must_change_password)
select
  'under' || lpad(n::text, 2, '0'),
  'U' || lpad(n::text, 3, '0'),
  under_class.id,
  'undergraduate',
  'student',
  crypt('123456', gen_salt('bf', 10)),
  true
from under_accounts cross join under_class
on conflict (username) do nothing;

insert into public.users_profile (username, anonymous_code, class_type, role, password_hash, must_change_password)
values
  ('teacher01', 'T001', null, 'teacher', crypt('123456', gen_salt('bf', 10)), true),
  ('admin01', 'A001', null, 'admin', crypt('123456', gen_salt('bf', 10)), true)
on conflict (username) do nothing;
