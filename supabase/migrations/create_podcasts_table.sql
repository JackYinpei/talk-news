-- Create table for podcasts
-- Combined structure including status, metrics, and updated fields
drop table if exists public.podcasts;

create table public.podcasts (
  id uuid default gen_random_uuid() primary key,
  -- Created at Beijing Time
  created_at timestamp without time zone default timezone('Asia/Shanghai'::text, now()) not null,
  category text not null,
  title text not null,
  summary text not null,
  script text not null,
  content jsonb, -- Stores the full JSON structure (items with specific images, order, etc.)
  image_url text[], -- Kept for backward compatibility or flattened access
  audio_url text, -- Supabase storage URL (nullable as it might be generating)
  date_folder text not null, -- e.g. '2026-01-01' to easily query 'today'
  
  updated_at timestamp without time zone default timezone('Asia/Shanghai'::text, now()),
  -- New fields
  status text check (status in ('in_progress', 'script_generated', 'completed', 'failed')) default 'in_progress', -- 运行中, 脚本已生成, 完成, 失败
  error_message text, -- To store why it failed
  audio_bytes bigint,
  audio_duration_seconds numeric
);

-- Add unique index for upsert support
create unique index if not exists podcasts_date_category_idx on public.podcasts (date_folder, category);

-- Enable RLS
alter table public.podcasts enable row level security;

-- Allow public read access
create policy "Allow public read access"
on public.podcasts for select
to public
using (true);

-- Allow backend (service role) to insert/update
-- (Service role bypasses RLS by default, but creating policies ensures clarity)
