-- Petica: početna shema (faza 1)

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  premium_until timestamptz,
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table content (
  id uuid primary key default gen_random_uuid(),
  game text not null,
  payload jsonb not null,
  source_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  difficulty int,
  created_at timestamptz not null default now()
);

-- Rješenja su odvojena od content: čita ih samo service role.
create table content_answers (
  content_id uuid primary key references content on delete cascade,
  answer jsonb not null
);

create table daily_schedule (
  date date not null,
  game text not null,
  content_id uuid not null references content,
  primary key (date, game)
);

create table plays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  game text not null,
  date date not null,
  content_id uuid references content,
  kind text not null check (kind in ('daily', 'extra')),
  state jsonb not null default '{}',
  score int,
  finished_at timestamptz
);
create unique index plays_one_daily on plays (user_id, game, date) where kind = 'daily';

create table user_seen (
  user_id uuid not null references auth.users on delete cascade,
  content_id uuid not null references content on delete cascade,
  primary key (user_id, content_id)
);

create table streaks (
  user_id uuid not null references auth.users on delete cascade,
  game text not null,
  current int not null default 0,
  best int not null default 0,
  last_date date,
  primary key (user_id, game)
);

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

alter table profiles enable row level security;
alter table content enable row level security;
alter table content_answers enable row level security;
alter table daily_schedule enable row level security;
alter table plays enable row level security;
alter table user_seen enable row level security;
alter table streaks enable row level security;

-- profiles: korisnik čita svoj; premium_until/role mijenja samo service role
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);

-- content: klijent vidi samo odobreno; content_answers nema politika => samo service role
create policy "content_select_approved" on content for select using (status = 'approved');
create policy "schedule_select" on daily_schedule for select using (true);

-- plays/streaks/user_seen: samo čitanje vlastitih; pisanje ide kroz Server Actions (service role)
create policy "plays_select_own" on plays for select using (auth.uid() = user_id);
create policy "streaks_select_own" on streaks for select using (auth.uid() = user_id);
create policy "seen_select_own" on user_seen for select using (auth.uid() = user_id);
