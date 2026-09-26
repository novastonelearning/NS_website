-- School co-branding: every school shares one Novastone look, and shows only
-- its name and a white logo beside the Novastone mark (never its own colors).
--
-- short_name is what the header shows on phones ("Lipscomb" rather than
-- "Lipscomb University College of Education"); it falls back to name.
-- logo_url points at a white/reversed logo in the public school-logos bucket.
-- Both are read through the existing institutions_select_own policy, so a
-- student only ever sees their own school's.

alter table institutions
  add column short_name text check (short_name is null or char_length(short_name) between 1 and 24),
  add column logo_url   text check (logo_url is null or logo_url ~ '^https://');

-- Public so a logo loads by URL without signing in (the /<slug> page shows it
-- before sign-in). Only the dashboard (service role) can upload. Guarded so the
-- in-process RLS test, which has no storage schema, still applies this file.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('school-logos', 'school-logos', true, 1048576, array['image/svg+xml', 'image/png', 'image/webp'])
    on conflict (id) do nothing;
  end if;
end $$;
