# Tech ELO

ELO tracking for pool and ping pong, plus a poker ledger, for Caltech houses.

## Features

- **University Email Authentication**: Secure login using Caltech email addresses with domain validation
- **Match Acceptance System**: Both players must confirm match start and result before ELO updates
- **Player Profiles**: Public profiles with stats, match history, and ELO progression
- **Global Leaderboards**: Filter by game type (pool/ping pong) with pagination
- **House/Clan System**: Create and join houses, view house-specific leaderboards and statistics
- **Poker Ledger**: Host-logged cash games and tournaments with a live ledger, RSVPs, sponsors, guests, acknowledge/dispute on entries, and a poker leaderboard
- **Inbox**: Pending challenges, results to confirm, and poker entries to acknowledge
- **Real-time Updates**: Live match status updates using Supabase Realtime
- **PWA Support**: Installable as a mobile app

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **Real-time**: Supabase Realtime
- **Email**: Resend (optional; skipped when `RESEND_API_KEY` is unset)

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests (vitest)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # production build
```

Environment variables go in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_UNIVERSITY_EMAIL_DOMAIN`, and
optionally `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.

## Database Schema

The application uses the following main tables:

- **users**: User profiles extending Supabase auth.users
- **dorms**: Houses (residence halls/clans)
- **matches**: Match records with acceptance tracking
- **elo_ratings**: Separate ELO ratings for pool and ping pong
- **match_disputes**: Dispute records for matches
- **poker_sessions**, **poker_entries**, **poker_rsvps**: Poker sessions, per-player ledger rows, and RSVPs
- **poker_sponsors**, **poker_session_sponsors**: Sponsor library and per-session links
- **poker_guests**: Placeholder players who can later be linked to real accounts

### Migrations

Migrations in `supabase/migrations/` are applied by hand in the Supabase
dashboard SQL editor, in order (001 through 014). Nothing applies them
automatically, so run any new migration before deploying code that uses it.

All of them are required. Match and poker state changes go through database
functions (`012_security_hardening_and_rpcs.sql`, `013_poker.sql`,
`014_poker_guests.sql`); the API routes call those functions and have no
fallback path when they are missing.

## ELO Rating System

- Initial rating: 1500
- K-factor: 32
- Separate ratings for pool and ping pong
- Ratings automatically update when matches are completed

## License

ISC
