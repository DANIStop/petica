-- Faza 4: idempotentni Stripe webhook

create table stripe_events (
  id text primary key,
  created_at timestamptz not null default now()
);
alter table stripe_events enable row level security; -- bez politika: samo service role

create index plays_user_game_kind on plays (user_id, game, kind) where finished_at is null;
create index profiles_stripe_customer on profiles (stripe_customer_id);
