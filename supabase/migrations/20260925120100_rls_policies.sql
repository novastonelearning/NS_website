-- Row-Level Security: the boundary the licensing model rests on.
--
-- Institution membership is read from the JWT, not from a table. A policy on
-- `users` that queried `users` would recurse; reading app_metadata avoids that
-- entirely and costs no round trip. The redeem/login path is responsible for
-- writing institution_id and role into app_metadata.

create function public.current_institution_id() returns uuid
language sql stable as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'institution_id', '')::uuid
$$;

create function public.current_app_role() returns text
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'student')
$$;

-- SECURITY DEFINER so it can read `institutions` without tripping that table's
-- own policy — otherwise the institutions policy would call this function,
-- which would read institutions, which would call the policy again.
create function public.institution_access_live(inst uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from institutions i
    where i.id = inst
      and i.status in ('trial', 'active')
      and (i.term_start is null or i.term_start <= current_date)
      and (i.term_end   is null or i.term_end   >= current_date)
  )
$$;

-- An expired term revokes access on its own, with no job to run.
create function public.my_access_live() returns boolean
language sql stable as $$
  select public.institution_access_live(public.current_institution_id())
$$;

alter table institutions        enable row level security;
alter table institution_domains enable row level security;
alter table films               enable row level security;
alter table film_sources        enable row level security;
alter table entitlements        enable row level security;
alter table users               enable row level security;
alter table view_events         enable row level security;
alter table reserved_slugs      enable row level security;

-- A person sees their own institution, and no other.
create policy institutions_select_own on institutions
  for select to authenticated
  using (id = public.current_institution_id());

-- The public catalogue: every published film is previewable by anyone. What a
-- school has bought is in entitlements, not here.
create policy films_select_published on films
  for select to anon, authenticated
  using (is_published);

-- Only the institution's own purchases, and only while its term is live.
create policy entitlements_select_own on entitlements
  for select to authenticated
  using (institution_id = public.current_institution_id() and public.my_access_live());

create policy users_select_self on users
  for select to authenticated
  using (id = (select auth.uid()));

create policy users_select_by_faculty on users
  for select to authenticated
  using (
    institution_id = public.current_institution_id()
    and public.current_app_role() in ('faculty', 'admin')
  );

create policy view_events_insert_own on view_events
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and institution_id = public.current_institution_id()
    and public.my_access_live()
  );

create policy view_events_select_own on view_events
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy view_events_select_faculty on view_events
  for select to authenticated
  using (
    institution_id = public.current_institution_id()
    and public.current_app_role() in ('faculty', 'admin')
  );

create policy view_events_update_own on view_events
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- No policies on institution_domains, film_sources or reserved_slugs: RLS is on
-- and nothing matches, so only service_role (which bypasses RLS) can read them.
-- Domain resolution and signed playback both run server-side by design.
revoke all on institution_domains from anon, authenticated;
revoke all on film_sources        from anon, authenticated;
revoke all on reserved_slugs      from anon, authenticated;
