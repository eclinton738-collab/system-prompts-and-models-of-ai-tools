-- Row-level security for every table, plus audit triggers.
--
-- Pattern:
--   * Public content is readable by anyone, but only once it is published.
--   * Staff write through is_admin('<department>'), which requires the role
--     (or super_admin) AND a two-factor (AAL2) session.
--   * People can read their own orders, tickets and memberships. They can never
--     write them: prices, ticket state and payment state are server-only.
--   * The service role (server, webhooks) bypasses RLS by design.

-- Enable + force-check RLS on every table in the public schema.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- Base grants. RLS policies below decide which rows are visible.
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
-- Server-only tables: no client access at all.
revoke all on public.payment_events from anon, authenticated;
revoke all on public.audit_log from anon;
revoke insert, update, delete on public.audit_log from authenticated;
revoke execute on function public.log_admin_action(text, jsonb) from anon, public;
grant execute on function public.log_admin_action(text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------
create policy "countries: public read" on public.countries for select using (true);
create policy "countries: super admin write" on public.countries for all to authenticated
  using ((select public.is_admin('super_admin'))) with check ((select public.is_admin('super_admin')));

create policy "states: public read" on public.states for select using (true);
create policy "states: super admin write" on public.states for all to authenticated
  using ((select public.is_admin('super_admin'))) with check ((select public.is_admin('super_admin')));

create policy "sports: public read" on public.sports for select using (true);
create policy "sports: talent write" on public.sports for all to authenticated
  using ((select public.is_admin('talent'))) with check ((select public.is_admin('talent')));

create policy "weight_classes: public read" on public.weight_classes for select using (true);
create policy "weight_classes: talent write" on public.weight_classes for all to authenticated
  using ((select public.is_admin('talent'))) with check ((select public.is_admin('talent')));

create policy "series: public read" on public.series for select
  using (is_active or (select public.is_admin('promotions')));
create policy "series: promotions write" on public.series for all to authenticated
  using ((select public.is_admin('promotions'))) with check ((select public.is_admin('promotions')));

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
create policy "profiles: read own" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles: staff read" on public.profiles for select to authenticated
  using ((select public.is_admin('promotions', 'talent', 'media', 'academies')));
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles: super admin write" on public.profiles for all to authenticated
  using ((select public.is_admin('super_admin'))) with check ((select public.is_admin('super_admin')));

create policy "roles: signed-in read" on public.roles for select to authenticated using (true);
create policy "roles: super admin write" on public.roles for all to authenticated
  using ((select public.is_admin('super_admin'))) with check ((select public.is_admin('super_admin')));

create policy "user_roles: read own" on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()));
create policy "user_roles: super admin manage" on public.user_roles for all to authenticated
  using ((select public.is_admin('super_admin'))) with check ((select public.is_admin('super_admin')));

-- ---------------------------------------------------------------------------
-- Settings and audit log
-- ---------------------------------------------------------------------------
create policy "settings: public read" on public.settings for select
  using (is_public or (select public.is_staff()));
create policy "settings: super admin write" on public.settings for all to authenticated
  using ((select public.is_admin('super_admin'))) with check ((select public.is_admin('super_admin')));

-- No insert/update/delete policy: rows are written by SECURITY DEFINER triggers only.
create policy "audit_log: super admin read" on public.audit_log for select to authenticated
  using ((select public.is_admin('super_admin')));

-- ---------------------------------------------------------------------------
-- Fighters, events, bouts, rankings
-- ---------------------------------------------------------------------------
create policy "fighters: public read" on public.fighters for select
  using (status <> 'draft' and rights_consent);
create policy "fighters: read own" on public.fighters for select to authenticated
  using (user_id = (select auth.uid()));
create policy "fighters: talent write" on public.fighters for all to authenticated
  using ((select public.is_admin('talent'))) with check ((select public.is_admin('talent')));

create policy "events: public read" on public.events for select
  using (status <> 'draft');
create policy "events: promotions write" on public.events for all to authenticated
  using ((select public.is_admin('promotions'))) with check ((select public.is_admin('promotions')));

create policy "bouts: public read" on public.bouts for select
  using (exists (select 1 from public.events e where e.id = event_id and e.status <> 'draft'));
create policy "bouts: promotions and talent write" on public.bouts for all to authenticated
  using ((select public.is_admin('promotions', 'talent')))
  with check ((select public.is_admin('promotions', 'talent')));

create policy "rankings: public read" on public.rankings for select using (true);
create policy "rankings: talent write" on public.rankings for all to authenticated
  using ((select public.is_admin('talent'))) with check ((select public.is_admin('talent')));

-- ---------------------------------------------------------------------------
-- Media
-- ---------------------------------------------------------------------------
create policy "articles: public read" on public.articles for select
  using (status = 'published' and published_at <= now());
create policy "articles: media write" on public.articles for all to authenticated
  using ((select public.is_admin('media'))) with check ((select public.is_admin('media')));

create policy "videos: public read" on public.videos for select
  using (status = 'published' and published_at <= now());
create policy "videos: media write" on public.videos for all to authenticated
  using ((select public.is_admin('media'))) with check ((select public.is_admin('media')));

create policy "products: public read" on public.products for select
  using (status = 'active');
create policy "products: media write" on public.products for all to authenticated
  using ((select public.is_admin('media'))) with check ((select public.is_admin('media')));

create policy "variants: public read" on public.variants for select
  using (is_active and exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy "variants: media write" on public.variants for all to authenticated
  using ((select public.is_admin('media'))) with check ((select public.is_admin('media')));

-- ---------------------------------------------------------------------------
-- Ticketing and orders (client read-only; server writes)
-- ---------------------------------------------------------------------------
create policy "ticket_types: public read" on public.ticket_types for select
  using (is_active and exists (select 1 from public.events e where e.id = event_id and e.status <> 'draft'));
create policy "ticket_types: promotions write" on public.ticket_types for all to authenticated
  using ((select public.is_admin('promotions'))) with check ((select public.is_admin('promotions')));

create policy "orders: read own" on public.orders for select to authenticated
  using (user_id = (select auth.uid()));
create policy "orders: staff read" on public.orders for select to authenticated
  using ((select public.is_admin('promotions', 'media', 'academies')));

create policy "order_items: read own" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy "order_items: staff read" on public.order_items for select to authenticated
  using ((select public.is_admin('promotions', 'media', 'academies')));

create policy "tickets: read own" on public.tickets for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "tickets: promotions read" on public.tickets for select to authenticated
  using ((select public.is_admin('promotions')));
-- Gate scanning / voiding by Promotions staff.
create policy "tickets: promotions update" on public.tickets for update to authenticated
  using ((select public.is_admin('promotions'))) with check ((select public.is_admin('promotions')));

-- payment_events: RLS on, no policies. Service role only.

create policy "carts: own" on public.carts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "cart_items: own" on public.cart_items for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- Lion's Den and memberships
-- ---------------------------------------------------------------------------
create policy "membership_plans: public read" on public.membership_plans for select
  using (is_active);
create policy "membership_plans: academies write" on public.membership_plans for all to authenticated
  using ((select public.is_admin('academies'))) with check ((select public.is_admin('academies')));

create policy "memberships: read own" on public.memberships for select to authenticated
  using (user_id = (select auth.uid()));
create policy "memberships: academies manage" on public.memberships for all to authenticated
  using ((select public.is_admin('academies'))) with check ((select public.is_admin('academies')));

create policy "class_schedule: public read" on public.class_schedule for select
  using (is_active);
create policy "class_schedule: academies write" on public.class_schedule for all to authenticated
  using ((select public.is_admin('academies'))) with check ((select public.is_admin('academies')));

-- ---------------------------------------------------------------------------
-- Applications: each department sees only its own pile.
-- ---------------------------------------------------------------------------
create policy "applications: read own" on public.applications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "applications: department manage" on public.applications for all to authenticated
  using (
    case type
      when 'fighter'   then (select public.is_admin('talent'))
      when 'tryout'    then (select public.is_admin('talent'))
      when 'franchise' then (select public.is_admin('academies'))
      when 'sponsor'   then (select public.is_admin('promotions'))
      else (select public.is_admin('super_admin'))   -- careers
    end
  )
  with check (
    case type
      when 'fighter'   then (select public.is_admin('talent'))
      when 'tryout'    then (select public.is_admin('talent'))
      when 'franchise' then (select public.is_admin('academies'))
      when 'sponsor'   then (select public.is_admin('promotions'))
      else (select public.is_admin('super_admin'))
    end
  );

-- ---------------------------------------------------------------------------
-- Play: predictions are 18+ and points only.
-- ---------------------------------------------------------------------------
create policy "predictions: read own" on public.predictions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "predictions: adult insert own" on public.predictions for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_adult()));
create policy "predictions: adult update own" on public.predictions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select public.is_adult()));
create policy "predictions: delete own" on public.predictions for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "leaderboards: public read" on public.leaderboards for select using (true);
create policy "leaderboards: media write" on public.leaderboards for all to authenticated
  using ((select public.is_admin('media'))) with check ((select public.is_admin('media')));

-- ---------------------------------------------------------------------------
-- Notifications, subscriptions, data requests
-- ---------------------------------------------------------------------------
create policy "notifications: read own" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications: mark own read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: delete own" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "subscriptions: own" on public.subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "subscriptions: media read" on public.subscriptions for select to authenticated
  using ((select public.is_admin('media')));

create policy "data_requests: read own" on public.data_requests for select to authenticated
  using (user_id = (select auth.uid()));
create policy "data_requests: super admin manage" on public.data_requests for all to authenticated
  using ((select public.is_admin('super_admin'))) with check ((select public.is_admin('super_admin')));

-- ---------------------------------------------------------------------------
-- Audit triggers on every table staff can change.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'countries', 'states', 'roles', 'user_roles', 'settings',
    'sports', 'weight_classes', 'series', 'fighters', 'events', 'bouts', 'rankings',
    'articles', 'videos', 'products', 'variants',
    'ticket_types', 'tickets', 'membership_plans', 'memberships', 'class_schedule',
    'applications', 'leaderboards', 'data_requests'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.audit_row()', t || '_audit', t);
  end loop;
end $$;
