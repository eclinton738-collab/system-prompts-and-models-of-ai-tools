-- Africa Combat League: core identity, roles, settings and audit log.
-- Every table in this schema has row-level security enabled (see 000500_rls.sql).

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Geography
-- ---------------------------------------------------------------------------
create table public.countries (
  code        char(2) primary key,              -- ISO 3166-1 alpha-2
  name        text not null unique,
  flag_emoji  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.states (
  id            uuid primary key default gen_random_uuid(),
  country_code  char(2) not null references public.countries (code),
  name          text not null,
  slug          text not null unique,
  code          text,                           -- e.g. "AB" for Abia
  capital       text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (country_code, name)
);

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  display_name       text,
  email              extensions.citext,
  phone              text,
  avatar_url         text,
  state_id           uuid references public.states (id),
  country_code       char(2) references public.countries (code),
  date_of_birth      date,                      -- needed for the 18+ gate only
  locale             text not null default 'en',
  currency           char(3) not null default 'NGN',
  data_saver         boolean not null default false,
  marketing_consent  boolean not null default false,
  consent_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index profiles_email_idx on public.profiles (email);
create index profiles_phone_idx on public.profiles (phone);
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Roles. Staff roles mirror the ACL subsidiaries.
-- ---------------------------------------------------------------------------
create table public.roles (
  key          text primary key,
  name         text not null,
  description  text,
  is_staff     boolean not null default false,
  sort_order   int not null default 0
);

create table public.user_roles (
  user_id     uuid not null references auth.users (id) on delete cascade,
  role_key    text not null references public.roles (key) on update cascade,
  granted_by  uuid references auth.users (id) on delete set null,
  granted_at  timestamptz not null default now(),
  primary key (user_id, role_key)
);
create index user_roles_role_idx on public.user_roles (role_key);

insert into public.roles (key, name, description, is_staff, sort_order) values
  ('super_admin', 'Super Admin', 'Founder level. Full control.', true, 10),
  ('promotions',  'Promotions',  'Events, ticketing, pay-per-view.', true, 20),
  ('talent',      'Talent',      'Fighters, rankings, applications.', true, 30),
  ('media',       'Media',       'News, video, shop content.', true, 40),
  ('academies',   'Academies',   'Lion''s Den, memberships, franchise.', true, 50),
  ('fighter',     'Fighter',     'A signed or applying ACL fighter.', false, 60),
  ('member',      'Member',      'Lion''s Den or Fan Club member.', false, 70),
  ('sponsor',     'Sponsor',     'A sponsor or partner account.', false, 80),
  ('fan',         'Fan',         'Default role for every account.', false, 90);

-- Does the current user hold any of these roles?
create or replace function public.has_role(variadic wanted text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role_key = any (wanted)
  );
$$;

-- Has the current session passed two-factor (Supabase MFA, AAL2)?
create or replace function public.is_aal2()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2';
$$;

-- Admin check used by every staff policy: role (or super admin) AND 2FA.
create or replace function public.is_admin(variadic wanted text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_aal2()
     and public.has_role(variadic wanted || array['super_admin']);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.key = ur.role_key
    where ur.user_id = (select auth.uid())
      and r.is_staff
  );
$$;

-- New auth user -> profile + default "fan" role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, phone, display_name, avatar_url)
  values (
    new.id,
    new.email,
    new.phone,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role_key)
  values (new.id, 'fan')
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep contact identifiers in sync when the user changes them in auth.
create or replace function public.handle_user_contact_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set email = new.email, phone = new.phone
   where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_contact_changed
  after update of email, phone on auth.users
  for each row execute function public.handle_user_contact_change();

-- Users may not change their identifiers or date of birth once set.
-- (Email and phone come from auth; date of birth backs the 18+ gate.)
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Service role / SQL editor / auth triggers have no end-user JWT.
  if (select auth.uid()) is null or public.is_admin('super_admin') then
    return new;
  end if;
  if new.email is distinct from old.email or new.phone is distinct from old.phone then
    raise exception 'Email and phone are managed by sign-in, not the profile.';
  end if;
  if old.date_of_birth is not null and new.date_of_birth is distinct from old.date_of_birth then
    raise exception 'Date of birth cannot be changed. Contact ACL support.';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_fields before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Is the current user 18 or older? Used by anything touching predictions or money.
create or replace function public.is_adult()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.date_of_birth is not null
      and p.date_of_birth <= (current_date - interval '18 years')
  );
$$;

-- ---------------------------------------------------------------------------
-- Settings: every editable fact about ACL lives here, never in code.
-- ---------------------------------------------------------------------------
create table public.settings (
  key          text primary key,
  value        jsonb not null,
  description  text,
  is_public    boolean not null default true,   -- false = staff only
  updated_by   uuid references auth.users (id) on delete set null,
  updated_at   timestamptz not null default now()
);
create trigger settings_set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Audit log: one row for every admin action. Written by trigger, never by clients.
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users (id) on delete set null,
  action      text not null,                    -- INSERT | UPDATE | DELETE | custom verb
  table_name  text,
  record_id   text,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id);
create index audit_log_table_idx on public.audit_log (table_name, record_id);

create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  old_row jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_row jsonb := case when tg_op in ('UPDATE', 'INSERT') then to_jsonb(new) end;
  ref jsonb := coalesce(new_row, old_row);
begin
  -- Log staff actions. Fan activity and server-side webhooks are not admin actions.
  if actor is not null and public.is_staff() then
    insert into public.audit_log (actor_id, action, table_name, record_id, old_data, new_data)
    values (
      actor,
      tg_op,
      tg_table_name,
      coalesce(ref ->> 'id', ref ->> 'key', ref ->> 'code', ref ->> 'user_id'),
      old_row,
      new_row
    );
  end if;
  return coalesce(new, old);
end;
$$;

-- For admin actions that are not a row change (exports, sign-ins to admin, etc.).
create or replace function public.log_admin_action(action text, detail jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff can write to the audit log.';
  end if;
  insert into public.audit_log (actor_id, action, new_data)
  values ((select auth.uid()), action, detail);
end;
$$;
