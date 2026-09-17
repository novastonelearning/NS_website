# Novastone Learning

The website and course platform for the Novastone Learning film series.

## What's in this folder

| Folder | What it is |
|---|---|
| `src/` | The website code (Next.js). The landing page is `src/app/page.tsx`. |
| `public/` | Images the website uses. |
| `design/landing-page-handoff/` | The original landing page design and its design notes (`README.md`). |
| `prototypes/` | Clickable design mockups, e.g. the Talk to Characters chat page (open the `.html` file in a browser). |

## Running the site on your computer

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Private keys (Supabase) live in `.env.local`, which is never saved to git. See `.env.example` for the names.
