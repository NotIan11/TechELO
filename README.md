# Tech ELO

ELO tracking application for pool and ping pong matches in Caltech houses.

## Features

- **University Email Authentication**: Secure login using Caltech email addresses with domain validation
- **Match Acceptance System**: Both players must confirm match start and result before ELO updates
- **Player Profiles**: Public profiles with stats, match history, and ELO progression
- **Global Leaderboards**: Filter by game type (pool/ping pong) with pagination
- **House/Clan System**: Create and join houses, view house-specific leaderboards and statistics
- **Real-time Updates**: Live match status updates using Supabase Realtime
- **PWA Support**: Installable as a mobile app

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **Real-time**: Supabase Realtime

## Database Schema

The application uses the following main tables:

- **users**: User profiles extending Supabase auth.users
- **dorms**: Houses (residence halls/clans)
- **matches**: Match records with acceptance tracking
- **elo_ratings**: Separate ELO ratings for pool and ping pong
- **match_disputes**: Dispute records for matches

### Migrations

Migrations in `supabase/migrations/` are applied by hand in the Supabase
dashboard SQL editor, in order (001 through 012).

**Important:** `012_security_hardening_and_rpcs.sql` locks down direct writes
to `matches`/`elo_ratings` and moves all match state changes into validated
database functions. The app works before and after it is applied (API routes
fall back to the legacy path if the functions are missing), but until you run
it any signed-in user can tamper with ratings and match results directly via
the Supabase API.

## ELO Rating System

- Initial rating: 1500
- K-factor: 32
- Separate ratings for pool and ping pong
- Ratings automatically update when matches are completed

## License

ISC
