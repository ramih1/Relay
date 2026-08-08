# Relay

Relay is an approval-first AI productivity command center for tasks, notes, reminders, calendars, email drafts, notifications, workouts, and nutrition logs.

## Features

- Vision-inspired responsive dashboard with reduced-motion support and theme options
- Real email/password accounts with scrypt password hashing and expiring HTTP-only sessions
- User-isolated PostgreSQL persistence through Prisma 7, with a file-backed local development mode
- Local Ollama assistant that creates Zod-validated proposals instead of silently changing data
- Editable confirmation queue with deterministic risk levels and an audit trail
- Tasks, notes, reminders, calendar events, notification ranking, and email drafts
- Per-user Google OAuth with encrypted tokens, Gmail draft creation, Calendar event creation, token refresh, disconnect, and retry states
- Review-first browser voice input
- Workout history, weekly movement summaries, calorie and optional macro tracking
- Health endpoint, structured server errors, security headers, CI, Docker, and Vercel configuration

Calls and call-related data have been removed from the product.

## Stack

- Next.js 15, React 19, TypeScript, Tailwind CSS
- PostgreSQL, Prisma 7, `@prisma/adapter-pg`
- Local Ollama using `qwen3:1.7b` by default
- Zod, Playwright, and Axe

## Lightweight Local Mode

This mode is best for an 8 GB Mac and does not require PostgreSQL.

```bash
git clone https://github.com/ramih1/Relay.git
cd Relay
pnpm install
cp .env.example .env.local
ollama pull qwen3:1.7b
```

Remove or leave `DATABASE_URL` blank in `.env.local`, then run Ollama and Relay in separate terminals:

```bash
ollama serve
```

```bash
pnpm dev
```

Open `http://localhost:3000`, create an account, and use Relay. Local passwords are scrypt-hashed, sessions are random and HTTP-only, and each account receives a separate ignored workspace file under `data/`.

## PostgreSQL Mode

Production requires PostgreSQL. For local PostgreSQL with Docker:

```bash
docker compose up -d postgres
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

Set these values in `.env.local`:

```bash
DATABASE_URL="postgresql://relay:relay@localhost:5432/relay?schema=public"
RELAY_ENCRYPTION_KEY="replace-with-output-from-openssl-rand-base64-32"
```

Supabase, Neon, or another PostgreSQL provider can be used by replacing `DATABASE_URL`. Run `pnpm db:migrate` against the selected database before starting the app.

## Google Workspace

Create a Google OAuth web client with this local redirect URI:

```txt
http://localhost:3000/api/google/callback
```

Configure:

```bash
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_OAUTH_REDIRECT_URI="http://localhost:3000/api/google/callback"
NEXT_PUBLIC_GOOGLE_OAUTH_CONFIGURED="1"
```

Restart Relay, open Settings, and choose **Connect Google Workspace**. Relay requests only Gmail compose and Calendar event scopes. Tokens are AES-256-GCM encrypted with `RELAY_ENCRYPTION_KEY` and stored per user. External email/calendar actions still require confirmation.

## Required Production Variables

- `DATABASE_URL`: direct PostgreSQL connection string
- `RELAY_ENCRYPTION_KEY`: high-entropy key for Google credentials
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`: required only when Google sync is enabled
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL`: local or privately hosted Ollama endpoint and model

Production startup fails closed when `DATABASE_URL` or `RELAY_ENCRYPTION_KEY` is missing. `ALLOW_FILE_STORAGE=1` is an explicit single-host demo override and should not be used for normal deployment.

## Commands

```bash
pnpm dev
pnpm build
pnpm start
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm run ci
pnpm demo:check
pnpm prisma:generate
pnpm prisma:format
pnpm db:migrate
pnpm db:studio
```

## Verification

The automated suite covers:

- AI proposal and approval safety
- strict server mutation validation and same-origin protection
- encrypted Google token round trips
- desktop and mobile rendering
- real registration and session flow
- isolation between two user accounts
- workout and meal persistence
- Axe serious/critical accessibility violations
- optimized production compilation

`/api/health` reports application and database readiness without exposing secrets. `/api/ai/health` reports the configured Ollama connection.

## Deployment

GitHub Actions runs migrations, type checking, linting, unit tests, and the production build against PostgreSQL. `Dockerfile` produces a non-root standalone Next.js image. `vercel.json` supports Vercel builds; configure the production environment variables and run Prisma migrations as part of release setup.

## Project Map

- `app/api/auth/`: registration, login, logout, and session endpoints
- `app/api/google/`: authenticated Google OAuth lifecycle
- `components/relay-app.tsx`: responsive application sections
- `components/dashboard/vision-dashboard.tsx`: dashboard composition
- `lib/server/auth.ts`: password and session security
- `lib/server/relay-store.ts`: user-scoped mutations and persistence
- `lib/server/relay-mutation-schema.ts`: strict API input boundary
- `lib/server/relay-secrets.ts`: encrypted per-user integration credentials
- `prisma/schema.prisma`: production data model
- `prisma/migrations/`: deployable PostgreSQL migrations
- `test/e2e/`: browser, accessibility, isolation, and persistence coverage
