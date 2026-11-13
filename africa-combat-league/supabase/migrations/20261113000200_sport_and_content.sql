-- Sports, divisions, fighters, events, bouts, rankings, news and video.
-- Sports and weight classes are DATA. Switching on MMA, kickboxing, Dambe or
-- Laamb is an UPDATE (is_active = true), never a migration.

create table public.sports (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,             -- boxing, mma, kickboxing, dambe, laamb
  name        text not null,
  description text,
  rules       jsonb not null default '{}'::jsonb, -- rounds, round length, scoring, result methods
  is_active   boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger sports_set_updated_at before update on public.sports
  for each row execute function public.set_updated_at();

create table public.weight_classes (
  id          uuid primary key default gen_random_uuid(),
  sport_id    uuid not null references public.sports (id) on delete cascade,
  name        text not null,
  slug        text not null,
  gender      text not null default 'men' check (gender in ('men', 'women', 'open')),
  min_weight_kg  numeric(5,2),
  max_weight_kg  numeric(5,2),                  -- null = no upper limit
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (sport_id, gender, slug)
);
create trigger weight_classes_set_updated_at before update on public.weight_classes
  for each row execute function public.set_updated_at();

create table public.series (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  tagline     text,
  description text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  is_sample   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger series_set_updated_at before update on public.series
  for each row execute function public.set_updated_at();

create table public.fighters (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique references auth.users (id) on delete set null,
  slug            text not null unique,
  first_name      text not null,
  last_name       text not null,
  nickname        text,
  state_id        uuid references public.states (id),
  country_code    char(2) references public.countries (code),
  sport_id        uuid references public.sports (id),
  weight_class_id uuid references public.weight_classes (id),
  wins            int not null default 0 check (wins >= 0),
  losses          int not null default 0 check (losses >= 0),
  draws           int not null default 0 check (draws >= 0),
  kos             int not null default 0 check (kos >= 0),
  height_cm       numeric(5,1),
  reach_cm        numeric(5,1),
  stance          text check (stance in ('orthodox', 'southpaw', 'switch')),
  date_of_birth   date,
  bio             text,
  photo_url       text,
  social_links    jsonb not null default '{}'::jsonb,
  status          text not null default 'draft'
                  check (status in ('draft', 'prospect', 'active', 'inactive', 'suspended', 'retired')),
  is_hall_of_fame boolean not null default false,
  -- The fighter has signed off on ACL using their name, image and footage.
  -- A fighter is never shown publicly without it.
  rights_consent    boolean not null default false,
  rights_consent_at timestamptz,
  is_sample       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index fighters_state_idx on public.fighters (state_id);
create index fighters_weight_class_idx on public.fighters (weight_class_id);
create index fighters_status_idx on public.fighters (status);
create trigger fighters_set_updated_at before update on public.fighters
  for each row execute function public.set_updated_at();

create table public.events (
  id            uuid primary key default gen_random_uuid(),
  series_id     uuid references public.series (id) on delete set null,
  title         text not null,
  subtitle      text,
  slug          text not null unique,
  description   text,
  venue         text,
  city          text,
  state_id      uuid references public.states (id),
  country_code  char(2) references public.countries (code),
  starts_at     timestamptz,                    -- null = date to be announced
  timezone      text not null default 'Africa/Lagos',
  status        text not null default 'draft'
                check (status in ('draft', 'announced', 'on_sale', 'live', 'completed', 'postponed', 'cancelled')),
  poster_url    text,
  stream_provider text check (stream_provider in ('cloudflare_stream', 'mux')),
  stream_id     text,
  attendance    int,
  is_sample     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index events_status_starts_idx on public.events (status, starts_at);
create index events_series_idx on public.events (series_id);
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();

create table public.bouts (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events (id) on delete cascade,
  bout_order      int not null default 0,       -- 1 = first fight of the night
  card_section    text not null default 'main' check (card_section in ('main', 'prelim', 'early')),
  red_fighter_id  uuid references public.fighters (id) on delete set null,
  blue_fighter_id uuid references public.fighters (id) on delete set null,
  sport_id        uuid references public.sports (id),
  weight_class_id uuid references public.weight_classes (id),
  rounds          int not null default 4 check (rounds between 1 and 15),
  is_title_bout   boolean not null default false,
  title_name      text,
  status          text not null default 'scheduled'
                  check (status in ('scheduled', 'live', 'completed', 'cancelled', 'no_contest')),
  -- Result
  winner_id       uuid references public.fighters (id) on delete set null,
  result_method   text,                         -- KO, TKO, UD, SD, MD, DQ, Draw, NC... (per sport rules)
  result_round    int,
  result_time     text,                         -- "2:41"
  scorecards      jsonb,                        -- [{ "judge": "...", "red": 39, "blue": 37 }]
  is_sample       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (red_fighter_id is null or red_fighter_id <> blue_fighter_id),
  check (winner_id is null or winner_id in (red_fighter_id, blue_fighter_id))
);
create index bouts_event_idx on public.bouts (event_id, bout_order);
create index bouts_red_idx on public.bouts (red_fighter_id);
create index bouts_blue_idx on public.bouts (blue_fighter_id);
create trigger bouts_set_updated_at before update on public.bouts
  for each row execute function public.set_updated_at();

create table public.rankings (
  id              uuid primary key default gen_random_uuid(),
  weight_class_id uuid not null references public.weight_classes (id) on delete cascade, -- the division
  week            date not null,                -- Monday of the ranking week
  rank            int not null check (rank >= 0), -- 0 = champion
  fighter_id      uuid not null references public.fighters (id) on delete cascade,
  movement        int not null default 0,       -- +2 = up two places, -1 = down one
  is_sample       boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (weight_class_id, week, rank),
  unique (weight_class_id, week, fighter_id)
);
create index rankings_fighter_idx on public.rankings (fighter_id);

create table public.articles (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  excerpt       text,
  body          text,
  cover_url     text,
  category      text,
  tags          text[] not null default '{}',
  author_id     uuid references auth.users (id) on delete set null,
  status        text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at  timestamptz,
  is_sample     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index articles_published_idx on public.articles (status, published_at desc);
create trigger articles_set_updated_at before update on public.articles
  for each row execute function public.set_updated_at();

create table public.videos (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  description   text,
  type          text not null default 'highlight'
                check (type in ('live', 'replay', 'full_fight', 'highlight', 'original', 'interview', 'training')),
  series        text,                           -- e.g. an ACL Originals series name
  chapter       int,                            -- episode / chapter number within the series
  access_level  text not null default 'free' check (access_level in ('free', 'member', 'ppv')),
  event_id      uuid references public.events (id) on delete set null,
  bout_id       uuid references public.bouts (id) on delete set null,
  provider      text check (provider in ('cloudflare_stream', 'mux')),
  -- Paid playback must use signed, short-lived tokens issued by the server.
  provider_asset_id text,
  thumbnail_url text,
  duration_seconds int,
  status        text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at  timestamptz,
  is_sample     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index videos_published_idx on public.videos (status, published_at desc);
create index videos_series_idx on public.videos (series, chapter);
create trigger videos_set_updated_at before update on public.videos
  for each row execute function public.set_updated_at();
