-- Stubs that stand in for what Supabase provides, so the migrations can run
-- against a bare Postgres. Not part of the real schema — test harness only.
create schema if not exists auth;

create table auth.users (
  id    uuid primary key,
  email text
);

-- Supabase reads the verified JWT from this GUC; the harness sets it per actor.
create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb
$$;

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

create role anon nologin;
create role authenticated nologin;
grant usage on schema public, auth to anon, authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
