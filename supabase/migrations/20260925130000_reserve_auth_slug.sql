-- The sign-in callback lives at /auth/callback, so no school may take the
-- "auth" slug. "logout" is held back for the same reason ahead of need.
insert into reserved_slugs (slug) values ('auth'), ('logout')
on conflict (slug) do nothing;
