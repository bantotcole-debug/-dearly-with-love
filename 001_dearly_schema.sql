-- Secure baseline schema for Dearly.
create extension if not exists pgcrypto;

create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 90),
  body text not null check (char_length(body) between 10 and 5000),
  mood text not null default 'A little hope',
  status text not null default 'pending' check (status in ('pending','approved','rejected','removed')),
  heart_count integer not null default 0 check (heart_count >= 0),
  created_at timestamptz not null default now()
);
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references public.letters(id) on delete cascade,
  visitor_hash text not null,
  created_at timestamptz not null default now(),
  unique(letter_id, visitor_hash)
);
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references public.letters(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 300),
  created_at timestamptz not null default now()
);
create table if not exists public.submission_limits (
  ip_hash text primary key,
  window_started_at timestamptz not null default now(),
  submission_count integer not null default 0
);

alter table public.letters enable row level security;
alter table public.reactions enable row level security;
alter table public.reports enable row level security;
alter table public.submission_limits enable row level security;

drop policy if exists "Anyone can read approved letters" on public.letters;
create policy "Anyone can read approved letters" on public.letters
for select to anon, authenticated using (status = 'approved');

grant select on public.letters to anon, authenticated;
revoke all on public.reactions, public.reports, public.submission_limits from anon, authenticated;
grant all on public.letters, public.reactions, public.reports, public.submission_limits to service_role;

create or replace function public.try_submission_limit(p_ip_hash text)
returns boolean language plpgsql security definer set search_path = public as $$
declare current_count integer;
begin
  insert into submission_limits(ip_hash, window_started_at, submission_count)
  values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update
    set window_started_at = case when submission_limits.window_started_at < now() - interval '1 hour' then now() else submission_limits.window_started_at end,
        submission_count = case when submission_limits.window_started_at < now() - interval '1 hour' then 1 else submission_limits.submission_count + 1 end
  returning submission_count into current_count;
  return current_count <= 3;
end; $$;
revoke all on function public.try_submission_limit(text) from public, anon, authenticated;
grant execute on function public.try_submission_limit(text) to service_role;

create or replace function public.add_heart(p_letter_id uuid, p_visitor_hash text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into reactions(letter_id, visitor_hash)
  select p_letter_id, p_visitor_hash from letters where id = p_letter_id and status = 'approved'
  on conflict (letter_id, visitor_hash) do nothing;
  if found then
    update letters set heart_count = heart_count + 1 where id = p_letter_id;
    return true;
  end if;
  return false;
end; $$;
revoke all on function public.add_heart(uuid,text) from public, anon, authenticated;
grant execute on function public.add_heart(uuid,text) to service_role;
