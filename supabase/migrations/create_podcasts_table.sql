
-- Create table for podcasts
create table if not exists public.podcasts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  category text not null,
  title text not null,
  summary text not null,
  script text not null,
  image_url text, -- The news image
  audio_url text not null, -- Supabase storage URL
  date_folder text not null -- e.g. '2026-01-01' to easily query 'today'
);

-- Add index for fast lookup by date and category
create index if not exists podcasts_date_category_idx on public.podcasts (date_folder, category);

-- Enable RLS
alter table public.podcasts enable row level security;

-- Allow public read access
create policy "Allow public read access"
on public.podcasts for select
to public
using (true);

-- Allow backend (service role) to insert/update
-- (Service role bypasses RLS by default, but good to be explicit if using authenticated user later)
