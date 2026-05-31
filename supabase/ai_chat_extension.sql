alter table public.ai_conversations
  add column if not exists archived_at timestamptz,
  add column if not exists last_message_at timestamptz;

update public.ai_conversations
set last_message_at = coalesce(last_message_at, updated_at, created_at)
where last_message_at is null;

create index if not exists idx_ai_conversations_user_archived_updated
  on public.ai_conversations(user_id, archived_at, updated_at desc);

create index if not exists idx_ai_conversations_user_last_message
  on public.ai_conversations(user_id, last_message_at desc);

create index if not exists idx_ai_messages_conversation_created_at
  on public.ai_messages(conversation_id, created_at);
