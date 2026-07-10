# Relay

Relay is a dashboard-first AI productivity assistant built with transparent approvals at the center of the workflow.

The current MVP already supports:

- dashboard brief and assistant command bar
- tasks, notes, reminders, calendar events, notifications
- approval queue for important actions
- email draft proposals
- optional Gmail draft sync when a Google access token is configured
- optional Google Calendar event sync when a Google access token is configured
- simulated call planning, transcript generation, and follow-up actions
- persisted profile, preferences, permissions, and workspace session

## Current Runtime

Right now the app is fully functional in a file-backed MVP mode:

- UI: Next.js + React + TypeScript + Tailwind CSS
- server: Next.js route handlers
- persistence: local JSON state file under `data/relay-state.json`
- AI logic: local structured planning logic in `lib/ai/agent.ts`

Prisma and PostgreSQL are scaffolded for the next backend step, but the app does not require Postgres to run today.

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. Copy the environment file:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
pnpm dev
```

4. Open:

```txt
http://localhost:3000
```

5. Sign in through the workspace gate and try commands like:

- `Remind me to submit my project Friday at 5`
- `Draft an email to my professor asking for an extension`
- `Turn this note into tasks`
- `Call the gym and ask if the basketball court is free tonight`
- `Plan my day around my 3 PM meeting`

## Useful Scripts

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm prisma:generate
pnpm prisma:format
pnpm db:push
pnpm db:studio
```

## Environment Variables

`DATABASE_URL`
- optional for now
- used when you want to connect Prisma to a real Postgres database later

`OPENAI_API_KEY`
- optional for now
- reserved for replacing the local assistant planner with a real OpenAI-backed flow

`GOOGLE_CLIENT_ID`
- required for one-click Google OAuth connect

`GOOGLE_CLIENT_SECRET`
- required for one-click Google OAuth connect

`GOOGLE_OAUTH_REDIRECT_URI`
- required for one-click Google OAuth connect
- should point to your local callback route, for example `http://localhost:3000/api/google/callback`

`GOOGLE_GMAIL_ACCESS_TOKEN`
- optional
- when present, approved Relay drafts can be pushed to Gmail using the Gmail drafts API
- the token needs Gmail compose scope

`GOOGLE_CALENDAR_ACCESS_TOKEN`
- optional
- when present, approved or manually created Relay calendar events can be pushed to Google Calendar
- the token needs Calendar events write access

`GOOGLE_CALENDAR_ID`
- optional
- defaults to `primary`

`GOOGLE_CALENDAR_TIMEZONE`
- optional
- defaults to `America/Toronto`

`NEXT_PUBLIC_DATABASE_CONFIGURED`
- optional UI hint
- set to `1` if you want the pre-hydration client to show database configured

`NEXT_PUBLIC_OPENAI_CONFIGURED`
- optional UI hint
- set to `1` if you want the pre-hydration client to show OpenAI configured

`NEXT_PUBLIC_GOOGLE_OAUTH_CONFIGURED`
- optional UI hint
- set to `1` if you want the pre-hydration client to show Google OAuth configured

`NEXT_PUBLIC_GMAIL_CONFIGURED`
- optional UI hint
- set to `1` if you want the pre-hydration client to show Gmail configured

`NEXT_PUBLIC_CALENDAR_CONFIGURED`
- optional UI hint
- set to `1` if you want the pre-hydration client to show Calendar configured

## If You Want Postgres Next

Once you have a Postgres database ready:

1. Put the real connection string into `.env.local` as `DATABASE_URL`
2. Run:

```bash
pnpm prisma:generate
pnpm db:push
```

3. The Prisma layer will be ready for wiring into the runtime store

## If You Want One-Click Google Connect

1. Create a Google Cloud OAuth client for a web application
2. Add this redirect URI in Google Cloud:

```txt
http://localhost:3000/api/google/callback
```

3. Put these in `.env.local`:

```bash
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_OAUTH_REDIRECT_URI="http://localhost:3000/api/google/callback"
NEXT_PUBLIC_GOOGLE_OAUTH_CONFIGURED="1"
```

4. Restart `pnpm dev`
5. Open Settings and click `Connect Google Workspace`

## Project Map

- `app/` page routes
- `components/relay-app.tsx` main UI surface
- `components/relay-provider.tsx` client state and action bridge
- `lib/types.ts` shared data contracts
- `lib/data.ts` seeded starter data
- `lib/server/relay-store.ts` server-side state mutations and persistence
- `lib/server/relay-insights.ts` dashboard brief and ranking logic
- `lib/ai/agent.ts` assistant intent parsing and proposal generation
- `prisma/schema.prisma` database schema scaffold

## Recommended First Demo Flow

1. Open the dashboard
2. Create a reminder through the assistant bar
3. Approve it in Confirmations
4. Open Notes and add messy notes
5. Extract tasks from the note
6. Draft an email
7. Create a simulated call
8. Review the generated transcript and follow-up suggestions
