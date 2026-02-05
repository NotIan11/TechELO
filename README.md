# Tech ELO

ELO tracking application for pool and ping pong matches in university houses.

## Features

- **University Email Authentication**: Secure login using university email addresses with domain validation
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

## Setup

### Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings** > **API** to get your keys:
   - **Project URL** - This is your `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable key** (formerly "anon key") - This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Secret key** (formerly "service role key") - Optional, not used in this app
3. Run the database migrations:
   - Go to **SQL Editor** in Supabase dashboard
   - Run the SQL files in `supabase/migrations/` in order:
     - `001_initial_schema.sql`
     - `002_rls_policies.sql`
     - `003_elo_functions.sql`
     - `004_user_creation_function.sql`
     - `005_storage_policies.sql`
     - `006_add_user_names.sql`

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_publishable_key
NEXT_PUBLIC_UNIVERSITY_EMAIL_DOMAIN=@university.edu
```

**Where to find these values:**
- `NEXT_PUBLIC_SUPABASE_URL`: In Supabase Dashboard > Project Settings > API > **Project URL**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: In Supabase Dashboard > Project Settings > API > **Publishable key** (the public one, safe for client-side)
- `NEXT_PUBLIC_UNIVERSITY_EMAIL_DOMAIN`: Replace `@university.edu` with your actual university email domain (e.g., `@caltech.edu`)

### 4. Configure Supabase Auth

1. In Supabase dashboard, go to Authentication > URL Configuration
2. Add your site URL (e.g., `http://localhost:3000` for development)
3. Add redirect URL: `http://localhost:3000/auth/callback`
4. For production, add your production URLs

#### Enable Email Confirmation

1. In Supabase dashboard, go to **Authentication** > **Settings**
2. Under **Email Auth**, ensure **Enable email confirmations** is turned ON
3. This ensures that new users must confirm their email address before they can log in
4. When a user signs up, they will automatically receive a confirmation email
5. If a user with an unconfirmed email tries to log in, a new confirmation email will be automatically sent

**Email Confirmation Flow:**
- New users receive a confirmation email immediately after signup
- Users must click the confirmation link in the email to activate their account
- If a user tries to log in with an unconfirmed email, a new confirmation email is automatically sent
- Users cannot access the app until their email is confirmed

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses the following main tables:

- **users**: User profiles extending Supabase auth.users
- **dorms**: Houses (residence halls/clans)
- **matches**: Match records with acceptance tracking
- **elo_ratings**: Separate ELO ratings for pool and ping pong
- **match_disputes**: Dispute records for matches

See `supabase/migrations/` for complete schema and database functions.

## ELO Rating System

- Initial rating: 1500
- K-factor: 32
- Separate ratings for pool and ping pong
- Ratings automatically update when matches are completed

## Project Structure

```
Tech ELO/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Auth callbacks
│   ├── dashboard/         # User dashboard
│   ├── dorms/             # House pages
│   ├── leaderboard/       # Leaderboard page
│   ├── matches/           # Match pages
│   └── profile/           # Player profile pages
├── components/            # React components
│   ├── auth/             # Auth components
│   ├── dorm/             # House components
│   ├── leaderboard/      # Leaderboard components
│   ├── match/            # Match components
│   └── ui/               # Reusable UI components
├── lib/                   # Utility functions
│   ├── supabase/         # Supabase clients
│   ├── types/            # TypeScript types
│   ├── elo.ts            # ELO calculations
│   └── utils.ts          # Helper functions
└── supabase/             # Database migrations
    └── migrations/       # SQL migration files
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS Amplify
- Self-hosted

## License

ISC
