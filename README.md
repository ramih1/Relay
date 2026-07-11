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
- AI provider: local Ollama inference through `lib/ai/ollama-provider.ts`
- AI safety: Zod-validated proposals routed into the confirmation center

Prisma and PostgreSQL are scaffolded for the next backend step, but the app does not require Postgres to run today.

## Local Demo From GitHub

Relay is designed to be demoed locally from the GitHub repository. No deployment account, hosted database, domain, or paid AI API is required for the demo.

1. Clone the repository and enter the project:

```bash
git clone https://github.com/98-rami/Relay.git
cd Relay
pnpm install
cp .env.example .env.local
ollama pull qwen3:4b
```

2. Start Ollama and leave this terminal open:

```bash
ollama serve
```

3. In another terminal, start Relay:

```bash
cd Relay
pnpm dev
```

4. Open `http://localhost:3000` and sign in through the demo workspace gate.

Relay runs entirely on your Mac. Ollama provides the local AI model, and local JSON files store demo data between browser refreshes. Google OAuth can optionally connect Gmail Drafts and Google Calendar; without it, those features stay local-only.

No Vercel deployment, hosted database, or paid AI API is needed. Keep the laptop running, `ollama serve` active, and the Relay development server open during the demo.

The default `qwen3:4b` model is chosen for reliable local use on 8 GB Macs. You can select a different installed Ollama model by changing `OLLAMA_MODEL` in `.env.local`.

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
pnpm lint
pnpm test
pnpm demo:check
pnpm prisma:generate
pnpm prisma:format
pnpm db:push
pnpm db:studio
```

## Environment Variables

`OLLAMA_BASE_URL`
- optional
- defaults to `http://127.0.0.1:11434`

`OLLAMA_MODEL`
- optional
- defaults to `qwen3:4b`

`GOOGLE_CLIENT_ID`
- required for one-click Google OAuth connect

`GOOGLE_CLIENT_SECRET`
- required for one-click Google OAuth connect

`GOOGLE_OAUTH_REDIRECT_URI`
- required for one-click Google OAuth connect
- should point to your local callback route, for example `http://localhost:3000/api/google/callback`

`GOOGLE_CALENDAR_ID`
- optional
- defaults to `primary`

`GOOGLE_CALENDAR_TIMEZONE`
- optional
- defaults to `America/Toronto`

`NEXT_PUBLIC_GOOGLE_OAUTH_CONFIGURED`
- optional UI hint
- change to `1` after Google OAuth is configured

`NEXT_PUBLIC_GMAIL_CONFIGURED`
- optional UI hint
- change to `1` after Google OAuth is configured

`NEXT_PUBLIC_CALENDAR_CONFIGURED`
- optional UI hint
- change to `1` after Google OAuth is configured

## Ollama Setup

Relay does not use OpenAI, Anthropic, Gemini, or another paid cloud AI API. Install Ollama, start it, and download the configured model:

```bash
ollama pull qwen3:4b
ollama serve
```

The local health endpoint is available at `/api/ai/health`. If Ollama is unavailable, Relay keeps the workspace data intact and shows setup instructions instead of inventing a proposal.

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

The OAuth tokens are saved only in Relay's ignored local secrets file. Never commit `.env.local`, `data/relay-secrets.json`, or OAuth tokens.

## Demo Readiness Check

Before presenting, run:

```bash
pnpm demo:check
```

It verifies dependencies, `.env.local`, writable local storage, the Ollama connection, and the configured model without printing secrets. Google OAuth is optional and produces a warning instead of failing the local demo.

## Project Map

- `app/` page routes
- `components/relay-app.tsx` main UI surface
- `components/relay-provider.tsx` client state and action bridge
- `lib/types.ts` shared data contracts
- `lib/data.ts` seeded starter data
- `lib/server/relay-store.ts` server-side state mutations and persistence
- `lib/server/relay-insights.ts` dashboard brief and ranking logic
- `lib/ai/provider.ts` provider abstraction
- `lib/ai/ollama-provider.ts` server-only Ollama client and health check
- `lib/ai/schemas.ts` strict proposal schemas
- `lib/ai/classify-command.ts` command classification and proposal adaptation
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
