-- ==========================================
-- PROFILES
-- ==========================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by all" on public.profiles;
create policy "Public profiles are viewable by all"
on public.profiles
for select
using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id);

-- ==========================================
-- MATCHES
-- ==========================================

create table if not exists public.matches (
  id serial primary key,
  match_date timestamptz not null,
  home_team text not null,
  away_team text not null,
  home_score integer,
  away_score integer,
  stage text not null default 'group',
  group_name text,
  deadline timestamptz not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.matches enable row level security;

drop policy if exists "Matches readable by all" on public.matches;
create policy "Matches readable by all"
on public.matches
for select
using (true);

-- ==========================================
-- PREDICTIONS
-- ==========================================

create table if not exists public.predictions (
  id serial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id integer not null references public.matches(id) on delete cascade,
  home_score integer not null,
  away_score integer not null,
  points integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, match_id)
);

alter table public.predictions enable row level security;

drop policy if exists "Predictions readable by all" on public.predictions;
create policy "Predictions readable by all"
on public.predictions
for select
using (true);

drop policy if exists "Users can insert own predictions" on public.predictions;
create policy "Users can insert own predictions"
on public.predictions
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own predictions" on public.predictions;
create policy "Users can update own predictions"
on public.predictions
for update
using (auth.uid() = user_id);

-- ==========================================
-- UPDATED_AT TRIGGER
-- ==========================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists predictions_updated_at on public.predictions;

create trigger predictions_updated_at
before update on public.predictions
for each row
execute function public.handle_updated_at();

-- ==========================================
-- SEED MATCHES
-- Officially published opening fixtures
-- ==========================================

insert into public.matches (
  match_date,
  home_team,
  away_team,
  stage,
  group_name,
  deadline,
  sort_order
)
values
('2026-06-11 20:00:00+00', 'Mexico', 'South Africa', 'group', 'A', '2026-06-10 23:59:00+00', 1),
('2026-06-12 03:00:00+00', 'South Korea', 'Czechia', 'group', 'A', '2026-06-11 23:59:00+00', 2),

('2026-06-12 19:00:00+00', 'Canada', 'Bosnia and Herzegovina', 'group', 'B', '2026-06-11 23:59:00+00', 3),
('2026-06-13 02:00:00+00', 'USA', 'Paraguay', 'group', 'D', '2026-06-12 23:59:00+00', 4),

('2026-06-13 16:00:00+00', 'Haiti', 'Scotland', 'group', 'C', '2026-06-12 23:59:00+00', 5),
('2026-06-13 23:00:00+00', 'Australia', 'Türkiye', 'group', 'D', '2026-06-12 23:59:00+00', 6),
('2026-06-14 00:00:00+00', 'Brazil', 'Morocco', 'group', 'C', '2026-06-13 23:59:00+00', 7),
('2026-06-14 03:00:00+00', 'Qatar', 'Switzerland', 'group', 'B', '2026-06-13 23:59:00+00', 8),

('2026-06-14 16:00:00+00', 'Côte d''Ivoire', 'Ecuador', 'group', 'E', '2026-06-13 23:59:00+00', 9),
('2026-06-14 19:00:00+00', 'Germany', 'Curaçao', 'group', 'E', '2026-06-13 23:59:00+00', 10),
('2026-06-14 22:00:00+00', 'Netherlands', 'Japan', 'group', 'F', '2026-06-13 23:59:00+00', 11),
('2026-06-15 01:00:00+00', 'Sweden', 'Tunisia', 'group', 'F', '2026-06-14 23:59:00+00', 12);