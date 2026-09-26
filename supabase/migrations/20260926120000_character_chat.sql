-- Talk to Characters and the MORAL Coach.
--
-- Prompt text (personas, film knowledge, the shared rules) is authored in
-- content/ and loaded by `npm run db:seed-content`. It lives in tables no client
-- role can read, so a student can never pull a character's instructions or a
-- film's full script through the API.
--
-- Chat rows are written only by the server (/api/chat), after it has checked
-- the sign-in and the film licence. Clients may read their own rows; faculty
-- may read their institution's. Transcripts are education records (FERPA), so
-- they follow exactly the same tenancy boundary as everything else.

create type conversation_kind as enum ('character', 'coach');
create type message_role as enum ('user', 'assistant');

-- What the chat page shows about each character. Safe for entitled users.
create table characters (
  id          uuid primary key default gen_random_uuid(),
  film_id     uuid not null references films(id) on delete cascade,
  slug        text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  name        text not null,
  role        text not null default '',
  pronouns    text not null default '',
  portrait_url text,
  intro       text not null default '',
  opener      text not null default '',
  suggested   jsonb not null default '[]'::jsonb check (jsonb_typeof(suggested) = 'array'),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (film_id, slug)
);

-- Server-only prompt material.
create table character_prompts (
  character_id  uuid primary key references characters(id) on delete cascade,
  persona       text not null,
  aliases       text[] not null default '{}',
  avoid_actions text not null default '',
  updated_at    timestamptz not null default now()
);

create table film_prompts (
  film_id          uuid primary key references films(id) on delete cascade,
  knowledge        text not null,
  continuity_notes text not null default '',
  -- null = follow the site-wide setting in prompt_settings.
  coach_uses_chat_summaries boolean,
  updated_at       timestamptz not null default now()
);

-- Shared templates (character rules, MORAL Coach, frameworks) and switches.
create table prompt_templates (
  key        text primary key,
  body       text not null,
  updated_at timestamptz not null default now()
);

create table prompt_settings (
  key   text primary key,
  value jsonb not null
);
insert into prompt_settings (key, value) values ('coach_uses_chat_summaries', 'true');

-- One running conversation per student per character (or per film, for the coach).
create table conversations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  institution_id uuid not null references institutions(id) on delete cascade,
  film_id        uuid not null references films(id) on delete cascade,
  character_id   uuid references characters(id) on delete cascade,
  kind           conversation_kind not null,
  created_at     timestamptz not null default now(),
  check ((kind = 'coach') = (character_id is null)),
  unique nulls not distinct (user_id, film_id, character_id)
);

create table messages (
  id              bigint generated always as identity primary key,
  conversation_id uuid not null references conversations(id) on delete cascade,
  role            message_role not null,
  content         text not null,
  created_at      timestamptz not null default now()
);

-- Notebook: bullet summaries of a character chat, or a saved coach report.
create table notebook_entries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  institution_id uuid not null references institutions(id) on delete cascade,
  film_id        uuid not null references films(id) on delete cascade,
  character_id   uuid references characters(id) on delete cascade, -- null = coach report
  bullets        jsonb not null default '[]'::jsonb check (jsonb_typeof(bullets) = 'array'),
  body           text not null default '',
  -- Last message this entry covers; lets the coach tell a chat has moved on.
  through_message_id bigint,
  auto_generated boolean not null default false,
  created_at     timestamptz not null default now()
);

create table reflections (
  user_id        uuid not null references users(id) on delete cascade,
  film_id        uuid not null references films(id) on delete cascade,
  institution_id uuid not null references institutions(id) on delete cascade,
  body           text not null default '' check (length(body) <= 20000),
  updated_at     timestamptz not null default now(),
  primary key (user_id, film_id)
);

create index on characters (film_id, sort_order);
create index on conversations (institution_id, film_id);
create index on messages (conversation_id, id);
create index on notebook_entries (user_id, film_id, created_at desc);
create index on notebook_entries (institution_id, film_id);
create index on reflections (institution_id, film_id);

-- A film the signed-in person's school currently licenses. SECURITY DEFINER so
-- the characters policy doesn't depend on the entitlements policy's own checks.
create function public.film_entitled(film uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_access_live() and exists (
    select 1 from entitlements e
    where e.film_id = film and e.institution_id = public.current_institution_id()
  )
$$;

alter table characters        enable row level security;
alter table character_prompts enable row level security;
alter table film_prompts      enable row level security;
alter table prompt_templates  enable row level security;
alter table prompt_settings   enable row level security;
alter table conversations     enable row level security;
alter table messages          enable row level security;
alter table notebook_entries  enable row level security;
alter table reflections       enable row level security;

create policy characters_select_entitled on characters
  for select to authenticated
  using (public.film_entitled(film_id));

create policy conversations_select_own on conversations
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy conversations_select_faculty on conversations
  for select to authenticated
  using (institution_id = public.current_institution_id() and public.current_app_role() in ('faculty', 'admin'));

create policy messages_select_visible on messages
  for select to authenticated
  using (exists (select 1 from conversations c where c.id = conversation_id)); -- conversations' own policies decide

create policy notebook_select_own on notebook_entries
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notebook_select_faculty on notebook_entries
  for select to authenticated
  using (institution_id = public.current_institution_id() and public.current_app_role() in ('faculty', 'admin'));

create policy reflections_select_own on reflections
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy reflections_select_faculty on reflections
  for select to authenticated
  using (institution_id = public.current_institution_id() and public.current_app_role() in ('faculty', 'admin'));

-- A student writes their own reflection, for a film their school licenses.
create policy reflections_insert_own on reflections
  for insert to authenticated
  with check (user_id = (select auth.uid()) and institution_id = public.current_institution_id() and public.film_entitled(film_id));

create policy reflections_update_own on reflections
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and institution_id = public.current_institution_id() and public.film_entitled(film_id));

-- No client may write chat rows or read prompt material.
revoke insert, update, delete on conversations, messages, notebook_entries from anon, authenticated;
revoke all on character_prompts, film_prompts, prompt_templates, prompt_settings from anon, authenticated;
revoke all on characters, reflections from anon;
