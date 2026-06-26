# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## DzPulse — Algerian Public Opinion Platform

**Frontend**: `artifacts/dzpulse` (React + Vite, port from `PORT` env)
**Backend**: `artifacts/api-server` (Express 5, port 8080)
**DB**: PostgreSQL + Drizzle ORM (`lib/db/src/schema/`)

### Completed Features
- Polymarket-style hero section (`trending-poll-hero.tsx`): featured poll + recharts AreaChart 14-day opinion timeline, navigation dots, Browse Topics sidebar (real categories)
- Market-style poll cards (`market-card.tsx`): inline voting rows, Vote buttons, change vote, IP-based deduplication, option image thumbnails (Polymarket style), wilaya badge, poll cover image
- Share menu (`share-menu.tsx`): portal-rendered dropdown (escapes `overflow:hidden`), OG image + story PNG download, social sharing
- Polls page (`polls.tsx`): category chip filter, Most Active sort, full 58-wilaya region dropdown
- Home page (`home.tsx`): live stats strip (real data), TrendingPollHero, market cards grid
- Real opinion timeline: backend timeline API + frontend recharts AreaChart with range selector (1H/24H/7D/30D/90D) + simulated fallback
- Admin hub (`admin.tsx`): 8-tab layout — Overview, Polls, Drafts, Users, Categories, Suggestions, Reports, Feedback; full CRUD, option images in forms, wilaya code picker
- Admin API (`routes/admin.ts`): users CRUD, poll full edit/delete, categories CRUD, draft listing, approve-suggestion-as-poll endpoint
- Poll editing: pencil icon on every poll row opens full EditPollForm (title, subtitle, description, image, category, type, region, options with imageUrl, tags, closesAt, status)
- Publish/Draft choice: "Create Poll" form has two submit buttons — "Publish Now" (status=open) and "Save as Draft" (status=draft)
- Beta badge in header next to DzPulse logo
- Cairo Arabic font for RTL UI
- Public feedback page (`/feedback`): category, name, email, message form → `POST /api/feedback`; admin can view all via Feedback tab
- Language switcher: EN/AR/FR with translations and RTL CSS support
- Drafts tab: dedicated section showing all draft polls with Publish/Edit/Delete actions; drafts are invisible to the public
- **Full poll translations seeded**: All 50+ polls have `title_ar`, `title_fr`, `subtitle_ar`, `subtitle_fr`, `description_ar`, `description_fr` in DB; all option labels have `label_ar`, `label_fr`; all 8 categories have `name_ar`, `name_fr`, `description_ar`, `description_fr`
- **Language-aware API**: `buildPollShape` picks AR/FR fields when `?lang=ar/fr` is passed; `GET /api/polls`, `GET /api/polls/:slug`, `GET /api/polls/:slug/related` all accept `?lang=` param
- **Auth-required voting**: Votes require authentication — the API returns 401 for unauthenticated POST `/api/polls/:slug/vote`; IP-based fallback removed
- **Change vote UI**: Poll detail + VoteOptions shows "Change my vote" button when user has already voted; clicking re-enters selection mode
- **Full i18n**: `language-context.tsx` has 140+ translation keys (EN/AR/FR) covering all pages — home, login, register, profile, topics, submit, polls, poll-detail, admin, feedback, about, methodology — plus all error messages, form labels, and UI strings. All pages use `useLang()` hook.
- **Admin translation fields**: Poll create/edit form has poll language selector (en/ar/fr) + "Add Translations" toggle that reveals title/subtitle/description in AR+FR + per-option AR/FR label fields
- **Admin API persists translations**: `POST /admin/polls` saves `title_ar`, `title_fr`, `subtitle_ar`, `subtitle_fr`, `description_ar`, `description_fr`, `poll_language`, and per-option `label_ar`, `label_fr`
- **`poll_language` column**: Added to polls table (DEFAULT 'en') for tagging polls by their primary language
- **Platform Mode (All / Professional / Social)**: 3-button toggle on the Explore page that filters polls by mode AND switches the color theme (Professional = blue via `html.theme-professional` CSS class; Social/All = green). Mode persists to `localStorage`. Powered by `PlatformModeProvider` in `lib/platform-mode-context.tsx`. Poll create forms (admin, private, suggestion) all expose a Platform Mode selector. DB column `poll_mode TEXT DEFAULT 'all'` on both `polls` and `suggestions` tables.
- **Pagination**: Explore page now shows 20 polls per page with numbered page chips + Prev/Next navigation
- **Anonymous poll creation**: `/api/polls/create-private` uses `optionalAuthMiddleware`; `suggestions.submitted_by` is nullable

### DB Schema Notes
- `polls` table: `title_ar`, `title_fr`, `subtitle_ar`, `subtitle_fr`, `description_ar`, `description_fr`, `poll_language TEXT DEFAULT 'en'`, `poll_mode TEXT DEFAULT 'all'`
- `suggestions` table: `poll_mode TEXT DEFAULT 'all'`, `submitted_by` is nullable
- `poll_options` table: `label_ar`, `label_fr`
- `categories` table: `name_ar`, `name_fr`, `description_ar`, `description_fr`
- All translation columns are TEXT NULLABLE (no NOT NULL constraint)
- Suggestion approval: "Approve & Publish" and "Approve as Draft" buttons replace the single "Approve" — creates a poll from the suggestion directly
- Auth rehydration: `auth-context.tsx` now calls `/api/auth/me` on mount to restore user from stored token (fixes page-reload auth loss)
- Google OAuth SSO (`routes/auth.ts`): `/auth/google` + `/auth/google/callback`, `auth-callback.tsx` frontend handler
- Full auth: JWT in localStorage `dzpulse_token`; IP-based anon voting with vote change support
- PNG share images: `/api/share/:slug/image` (1200×630 OG) and `/api/share/:slug/story` (1080×1920)

### Database — Production State (launch)
- 50 real Algerian polls across 8 categories (Politics, Economy, Society, Environment, Technology, Sports, Youth, Health)
- 0 votes, 0 comments — all data is real from day one
- Run `npx tsx lib/db/src/seed.ts` to reset and re-seed (wipes all data, re-inserts 50 polls)

### Seed Credentials
- Admin only: `admin@dzpulse.dz` / `dzpulse20262027` (username: `dzpulse_admin`)

### Google OAuth Setup (requires env vars)
To enable Google SSO in production, set:
- `GOOGLE_CLIENT_ID` — from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — from Google Cloud Console
- `APP_URL` — public frontend URL (e.g. `https://dzpulse.replit.app`)
- `API_ORIGIN` — public API URL (e.g. `https://dzpulse.replit.app/api`)
Set redirect URI in Google Cloud Console to: `{API_ORIGIN}/auth/google/callback`

### Key Patterns
- `useCastVote({ slug, data: { optionId } })` — cast a vote (IP-deduped, change allowed)
- `adminFetch()` helper in admin.tsx for authenticated admin API calls
- `useSubmitReport`, `useSubmitSuggestion` — report/suggest hooks
- `Poll.options` can be undefined in trending API response — use allPolls for hero
- Share dropdown uses `createPortal` to escape `overflow:hidden` on cards
