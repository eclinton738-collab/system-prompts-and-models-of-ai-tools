-- Applications, predictions (points only, no real-money wagering), leaderboards,
-- notifications, channel subscriptions and NDPA data requests.

-- Public forms never insert here directly. The server verifies CAPTCHA and
-- rate limits, then writes with the service role.
create table public.applications (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('fighter', 'tryout', 'careers', 'franchise', 'sponsor')),
  user_id       uuid references auth.users (id) on delete set null,
  full_name     text not null,
  email         extensions.citext,
  phone         text,
  state_id      uuid references public.states (id),
  country_code  char(2) references public.countries (code),
  payload       jsonb not null default '{}'::jsonb, -- type-specific answers
  consent       boolean not null default false,     -- NDPA consent to process
  consent_at    timestamptz,
  status        text not null default 'new' check (status in ('new', 'reviewing', 'shortlisted', 'accepted', 'rejected')),
  reviewed_by   uuid references auth.users (id) on delete set null,
  staff_notes   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index applications_type_status_idx on public.applications (type, status, created_at desc);
create index applications_user_idx on public.applications (user_id);
create trigger applications_set_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

create table public.predictions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  bout_id           uuid not null references public.bouts (id) on delete cascade,
  picked_fighter_id uuid not null references public.fighters (id) on delete cascade,
  picked_method     text,
  picked_round      int,
  points_awarded    int,                        -- set by the server after the result
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, bout_id)
);
create index predictions_bout_idx on public.predictions (bout_id);
create trigger predictions_set_updated_at before update on public.predictions
  for each row execute function public.set_updated_at();

-- Picks lock when the bout starts, and points are only ever set by the server.
create or replace function public.guard_prediction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  bout_status text;
begin
  if (select auth.uid()) is null then
    return new; -- service role scoring
  end if;
  select b.status into bout_status from public.bouts b where b.id = new.bout_id;
  if bout_status is distinct from 'scheduled' then
    raise exception 'Picks are locked for this bout.';
  end if;
  if tg_op = 'INSERT' then
    new.points_awarded := null;
  else
    new.points_awarded := old.points_awarded;
  end if;
  return new;
end;
$$;
create trigger predictions_guard before insert or update on public.predictions
  for each row execute function public.guard_prediction();

create table public.leaderboards (
  id          uuid primary key default gen_random_uuid(),
  game        text not null check (game in ('pick_em', 'fight_iq')),
  scope       text not null default 'all_time', -- all_time | season:2027 | event:<uuid> | state:<slug>
  user_id     uuid not null references auth.users (id) on delete cascade,
  display_name text,                            -- snapshot, so profiles stay private
  points      int not null default 0,
  rank        int,
  updated_at  timestamptz not null default now(),
  unique (game, scope, user_id)
);
create index leaderboards_rank_idx on public.leaderboards (game, scope, rank);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  type        text not null,                    -- event_reminder, ticket_ready, result...
  title       text not null,
  body        text,
  url         text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Where a person has asked ACL to reach them: email, SMS, WhatsApp or web push.
create table public.subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  channel     text not null check (channel in ('email', 'sms', 'whatsapp', 'push')),
  address     text not null,                    -- email, E.164 phone, or push endpoint
  push_keys   jsonb,                            -- { p256dh, auth } for web push
  topics      text[] not null default '{}',     -- events, results, news, shop...
  consent_at  timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (channel, address)
);
create index subscriptions_user_idx on public.subscriptions (user_id);

-- Nigeria Data Protection Act 2023: access, correction, deletion, objection.
create table public.data_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  type        text not null check (type in ('access', 'correction', 'deletion', 'portability', 'objection', 'withdraw_consent')),
  full_name   text not null,
  email       extensions.citext,
  phone       text,
  details     text,
  status      text not null default 'new' check (status in ('new', 'in_progress', 'completed', 'rejected')),
  handled_by  uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger data_requests_set_updated_at before update on public.data_requests
  for each row execute function public.set_updated_at();
