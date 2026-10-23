# Loqelo

A pre-launch site for Loqelo, connecting customers with local professionals for home, garden, and office services.

## Run & Operate

- `pnpm --filter @workspace/loqelo run dev` — run the Loqelo website
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run export:waitlist` — create a private, timestamped waitlist CSV
- `pnpm --filter @workspace/scripts run export:analytics` — create a daily analytics CSV grouped by country
- `pnpm --filter @workspace/api-server run upload:loqelo-promo` — re-upload the supplied video to App Storage
- Required env: `DATABASE_URL` — Postgres connection string
- App Storage uses its managed bucket variables; do not replace them with local credentials.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- Website and translations: `artifacts/loqelo/src/App.tsx`
- Website visual system: `artifacts/loqelo/src/index.css`
- Website SEO shell and public files: `artifacts/loqelo/index.html`, `artifacts/loqelo/public/`
- API contract: `lib/api-spec/openapi.yaml`
- Waitlist and first-party analytics routes: `artifacts/api-server/src/routes/waitlist.ts`
- Database tables: `lib/db/src/schema/waitlist.ts`
- Owner instructions: `docs/loqelo-admin.md`

## Architecture decisions

- Waitlist contact details stay in PostgreSQL; no public export endpoint is exposed.
- Analytics are first-party and are recorded only after explicit analytics consent. Analytics events never include email or free-form form content.
- The promo video is served from App Storage rather than included as a large deploy asset.
- Country and language hints are used only to suggest form defaults; visitors can change both.

## Product

The single-page site introduces the Loqelo marketplace, shows the supplied product screens and launch video, explains the request-to-offer flow, and collects separate customer and provider waitlist sign-ups ahead of the February 2027 launch. It supports English, Polish, and Arabic, with Arabic right-to-left layout.

## User preferences

The user provided the Loqelo visual identity, exported desktop/mobile product screens, and promotional video. Use these supplied assets as the source of truth for future changes.

## Gotchas

- Keep OpenAPI, generated hooks, and server validators in sync: rerun codegen after every API contract change.
- Do not add email addresses or other form fields to analytics payloads.
- CSV exports contain personal contact data and are intentionally written outside public assets to `generated-artifacts/`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
