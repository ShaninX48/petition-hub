# Petition Hub

Verified petitions for civic issues — no petition goes public until an admin confirms it's real.

**Live app:** [petition-hub-beige.vercel.app](https://petition-hub-beige.vercel.app)

## The problem

Anyone can start an online petition, which means anyone can also fake one. Petition Hub adds a manual verification gate: every new petition sits in a `pending` queue until an admin reviews the issue itself, and the account that filed it, before it's visible to the public.

## How verification works

- A signed-in user submits a petition (title, description, category, optional location). It's created with `pending` status — the client can never set status directly.
- An admin reviews the queue (oldest first) and either:
  - **Approves** → status flips to `green`. The petition becomes publicly visible and signable, and the action is logged.
  - **Rejects** → status flips to `red`, with a required note explaining why. Also logged.
- Regular users only ever see `green` petitions in the public feed. A creator can always see their own petition's status (pending/green/red) on their dashboard, even before it's public.
- A `green` stamp means "verified real issue". A `red` stamp is only ever visible to the creator on their dashboard — rejected petitions never appear in the public feed. Stamps are rendered by a shared `StampBadge` component.

## Features

- **Email/password auth** via Supabase Auth, with a `profiles` table carrying each user's role (`regular_user` or `admin`)
- **Trending petitions** — ranked by signatures gained in the last 48h (via a `trending_petitions` Postgres view), verified-only by construction
- **Nearby petitions** — petitions within a radius of a lat/lng point, nearest first, via a PostGIS-backed `nearby_petitions()` Postgres function
- **Search + category filter** on the public feed (title, description, location)
- **Signature progress bars** toward a goal, with weekly velocity (`+N this week`)
- **Signing** — one signature per user per petition, enforced at the DB level (unique constraint → friendly "already signed" error)
- **Creator dashboard** — every petition a user has filed, regardless of status, newest first
- **Admin queue** — approve/reject pending petitions with a required rejection note; every decision is logged in `admin_actions`
- **PWA support** — installable manifest + a minimal service worker that caches the app shell only (deliberately does *not* cache API/data responses, since signature counts and statuses change constantly)
- **Dark/light theme toggle**, sticky mobile-friendly navbar, skeleton loading states

## Tech stack

- **Framework:** Next.js 16 (App Router) + React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Backend:** Supabase — Postgres (with PostGIS for geo queries), Auth, and Row Level Security as the actual enforcement layer (client-side checks are just early UI guards)
- **Deployment:** Vercel

## Data model

| Table / view | Purpose |
|---|---|
| `profiles` | user id, name, role (`regular_user` \| `admin`) |
| `petitions` | title, description, category, location, `status` (`pending` \| `green` \| `red` \| `closed`), `admin_note` |
| `signatures` | one row per (petition, user) signature |
| `admin_actions` | audit log of every approve/reject/close decision |
| `trending_petitions` (view) | green petitions ranked by recent signature velocity |
| `nearby_petitions()` (function) | green petitions near a point, with distance |

> `expires_at`, `evidence_urls`, and `closed` exist in the schema as reserved fields — expiry auto-close and evidence uploads are not implemented yet (see Roadmap).

Row Level Security is the real gatekeeper throughout: e.g. only `green` petitions are selectable by regular users, and only admins can write to `admin_actions` — the app code mirrors these rules for UX but doesn't rely on them for security.

## Getting started

```bash
git clone https://github.com/ShaninX48/petition-hub.git
cd petition-hub
npm install
```

Create a `.env.local` with your Supabase project credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Then run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> Without real Supabase credentials, the client falls back to placeholder values and logs a console warning — auth and data calls will fail until `.env.local` is set.

## Roadmap

- [ ] Petition deadline/expiry — auto-close after N days without traction
- [ ] Evidence attachments for verification (define required proof, wire up `evidence_urls`)
- [ ] Expand admin tooling beyond approve/reject (e.g. bulk actions, filters)

## Status

Actively in development.
