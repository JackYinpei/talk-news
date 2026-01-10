alter table public.podcasts
  add column if not exists audio_bytes bigint,
  add column if not exists audio_duration_seconds integer;
