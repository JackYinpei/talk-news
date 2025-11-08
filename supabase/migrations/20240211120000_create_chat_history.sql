create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  news_key text not null,
  news_title text,
  news jsonb,
  history jsonb not null,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists chat_history_user_news_key_idx
  on public.chat_history (user_id, news_key);

create index if not exists chat_history_user_created_idx
  on public.chat_history (user_id, created_at desc);

drop trigger if exists chat_history_set_updated_at on public.chat_history;

create trigger chat_history_set_updated_at
  before update on public.chat_history
  for each row execute function public.set_updated_at();
