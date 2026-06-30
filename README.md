# JARVIS

JARVIS is a dashboard-first AI productivity assistant built with transparent approvals at the center of the workflow.

The current MVP already supports:

- dashboard brief and assistant command bar
- tasks, notes, reminders, calendar events, notifications
- approval queue for important actions
- email draft proposals
- simulated call planning, transcript generation, and follow-up actions
- persisted profile, preferences, permissions, and workspace session

## Current Runtime

Right now the app is fully functional in a file-backed MVP mode:

- UI: Next.js + React + TypeScript + Tailwind CSS
- server: Next.js route handlers
- persistence: local JSON state file under `data/jarvis-state.json`
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

`NEXT_PUBLIC_DATABASE_CONFIGURED`
- optional UI hint
- set to `1` if you want the pre-hydration client to show database configured

`NEXT_PUBLIC_OPENAI_CONFIGURED`
- optional UI hint
- set to `1` if you want the pre-hydration client to show OpenAI configured

## If You Want Postgres Next

Once you have a Postgres database ready:

1. Put the real connection string into `.env.local` as `DATABASE_URL`
2. Run:

```bash
pnpm prisma:generate
pnpm db:push
```

3. The Prisma layer will be ready for wiring into the runtime store

## Project Map

- `app/` page routes
- `components/jarvis-app.tsx` main UI surface
- `components/jarvis-provider.tsx` client state and action bridge
- `lib/types.ts` shared data contracts
- `lib/data.ts` seeded starter data
- `lib/server/jarvis-store.ts` server-side state mutations and persistence
- `lib/server/jarvis-insights.ts` dashboard brief and ranking logic
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
