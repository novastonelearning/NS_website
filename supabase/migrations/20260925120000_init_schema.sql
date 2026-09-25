-- Novastone Learning — core schema.
-- The institution is the tenant: resolve which institution a person belongs to
-- and their film list follows from it.

-- A trial is an institution too — status 'trial', a short term, one entitlement.
-- Keeping trials in this table means RLS, the library and the player need no special case.
create type institution_status as enum ('trial', 'active', 'expired', 'suspended');
create type user_role as enum ('student', 'faculty', 'admin');

create table institutions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  access_code text not null unique,
  status      institution_status not null default 'active',
  term_start  date,
  term_end    date,
  created_at  timestamptz not null default now(),
  check (term_end is null or term_start is null or term_end >= term_start)
);

comment on table institutions is
  'One row per subscribing university. Trials live here too, with status = trial.';

-- Branded entry runs at novastonelearning.com/<slug>, so a slug must never
-- shadow a real route. A CHECK cannot hold a subquery, hence the trigger.
create table reserved_slugs (slug text primary key);
insert into reserved_slugs (slug) values
  ('about'),('account'),('adopt'),('ai'),('admin'),('api'),('approach'),
  ('accessibility'),('characters'),('contact'),('films'),('institutions'),
  ('library'),('login'),('privacy'),('redeem'),('request-access'),('terms'),
  ('watch');

create function reject_reserved_slug() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from reserved_slugs r where r.slug = new.slug) then
    raise exception 'slug "%" is reserved for a site route', new.slug;
  end if;
  return new;
end $$;

create trigger institutions_slug_guard
  before insert or update of slug on institutions
  for each row execute function reject_reserved_slug();

-- One domain resolves to exactly one institution: this is the gate.
create table institution_domains (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  domain         text not null unique check (domain = lower(domain) and domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  created_at     timestamptz not null default now()
);

create table films (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  title             text not null,
  theme             text,
  runtime_min       int check (runtime_min > 0),
  logline           text,
  synopsis          text,
  poster_url        text,
  trailer_vimeo_id  text,
  sort_order        int not null default 0,
  is_published      boolean not null default false,
  created_at        timestamptz not null default now()
);

-- Playback identifiers live apart from the catalogue so they can be denied to
-- every client role. RLS is row-level, not column-level — a separate table is
-- the only way to keep these out of a public SELECT on films.
create table film_sources (
  film_id     uuid primary key references films(id) on delete cascade,
  provider    text not null,
  playback_id text not null,
  updated_at  timestamptz not null default now()
);

create table entitlements (
  institution_id uuid not null references institutions(id) on delete cascade,
  film_id        uuid not null references films(id) on delete cascade,
  added_at       timestamptz not null default now(),
  primary key (institution_id, film_id)
);

create table users (
  id             uuid primary key references auth.users(id) on delete cascade,
  institution_id uuid not null references institutions(id) on delete restrict,
  email          text not null,
  role           user_role not null default 'student',
  created_at     timestamptz not null default now()
);

create table view_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  institution_id  uuid not null references institutions(id) on delete cascade,
  film_id         uuid not null references films(id) on delete cascade,
  started_at      timestamptz not null default now(),
  seconds_watched int not null default 0 check (seconds_watched >= 0),
  completed       boolean not null default false
);

create index on entitlements (institution_id);
create index on institution_domains (institution_id);
create index on users (institution_id);
create index on view_events (institution_id, film_id);
create index on view_events (user_id, film_id);
create index on films (sort_order) where is_published;
