# TANKY

**Tanken. Bezahlen. Weiterfahren.**
The Payment & Fueling Layer for Mobility — Swiss mobile fueling, payment & mobility platform.

This is the v0.1 MVP foundation: a real transaction engine and provider architecture, running today against mock payment and forecourt providers, built so those mocks can be swapped for live integrations later without touching the transaction logic, screens, or API contracts.

## Quick start

```bash
# 1. Install everything (npm workspaces monorepo)
npm install

# 2. Build the shared domain package (run again after editing packages/domain)
npm run build -w @tanky/domain

# 3. Start the backend (in one terminal)
npm run dev:api          # http://localhost:4000

# 4. Start the app (in another terminal)
npm run dev:mobile       # opens http://localhost:8081

# 5. Start the marketing site (optional, in another terminal)
npm run dev:website      # http://localhost:3000
```

Open **http://localhost:8081** in a browser at a desktop width (≥860px) to see the iPhone device-frame demo view. On a real phone or narrow viewport it renders edge-to-edge like a normal installed PWA.

**Demo login:** `demo@tanky.ch` / `tanky-demo-2026` (prefilled on the login screen).
**Admin login:** `admin@tanky.ch` / `tanky-demo-2026` (via the Admin button on the launcher).

The backend seeds these accounts automatically on first run (SQLite file at `apps/api/data/tanky.db`, gitignored). Delete that file to reset to a clean demo state.

## What you're looking at

- **`/`** — launcher/demo start page (Open App / Demo Control / Admin, environment badge)
- **`/(phone)/...`** — the actual TANKY consumer app (login → home → station → pump → payment → authorizing → fueling → completion → receipt → history → profile), rendered inside a realistic iPhone frame on desktop
- **`/demo-control`** — arms one-shot failure/fast-forward scenarios (payment decline, pump failure, network error, capture failure, instant-complete) against whichever transaction is currently running in the app
- **`/admin`** — live metrics (revenue, liters, failure rate) and a transaction table, gated behind the admin account

## Architecture

```
packages/domain      Shared, framework-free TypeScript: transaction state machine,
                      PaymentProvider / FuelStationProvider interfaces, Mock
                      implementations of both, Swiss demo seed data (stations,
                      pumps, fuel products). Consumed by both apps below.

apps/api              Fastify + TypeScript + SQLite (via node:sqlite — no native
                      deps, no Docker). Owns every state transition, auth
                      (bcrypt + JWT), idempotent payment capture, and the
                      demo-control endpoints. The client never authorizes a
                      pump or confirms a payment directly — it only ever
                      requests a transition, which the backend validates
                      against the state machine before touching a provider.

apps/mobile           Expo (React Native + Expo Router) with web output as an
                      installable PWA (manifest + service worker in public/).
                      Same codebase is the future path to native iOS/Android.

apps/website           Static marketing site (no framework, no build step) —
                      hero, benefits, how-it-works, download/install CTAs.
                      Deployable to any static host.
```

Swapping in real providers later (Stripe, TWINT, a forecourt integration) means writing a new class that implements `PaymentProvider` / `FuelStationProvider` and wiring it in `apps/api/src/providers.ts` — nothing else changes.

### Transaction integrity

Every fuel transaction gets its own server-generated id and idempotency key — isolation between two people using the same physical pump comes from that, never from `pump_id` alone. The state machine (`packages/domain/src/state-machine.ts`) is a strict transition table; illegal jumps (e.g. straight to `PAYMENT_CAPTURED`) throw. See `packages/domain/src/state-machine.test.ts` for the enforced happy path and rejection cases.

The critical isolation case — User A and User B using the same pump back-to-back, each paying a different amount, with zero cross-contamination — is exercised manually via the API; see the transaction events log (`GET /api/v1/transactions/:id/events`) for the full audit trail per transaction.

### Money

Payment amounts are integer **Rappen** (CHF cents). Pump prices need a third decimal (CHF 1.699/L), so those use a separate integer unit, **MilliFrancs** (1 = CHF 0.001), only ever rounded down to Rappen at the moment a final amount is charged. See `packages/domain/src/types.ts`.

## Marketing site (`apps/website`)

A standalone, dependency-free static site: hero, "Vorteile" (benefits), "So funktioniert's" (how it works), and a download section. The primary, **working today** call to action is installing the PWA (`apps/mobile`) — real App Store / Google Play badges are shown as "Bald verfügbar" rather than dead links, since there's no live store listing yet (see below). Update `APP_URL` in `apps/website/app.js` once the app is deployed to its real domain (e.g. `https://app.tanky.ch`).

## Path to real iOS / Android store listings

The app is already Expo-based specifically so this is a configuration step, not a rewrite. `apps/mobile/eas.json` has build profiles ready (`development`, `preview`, `production`). To actually publish:

1. You need your own **Apple Developer Program** account (CHF ~99/year) and **Google Play Console** account (one-time ~USD 25) — these can't be created or paid for on your behalf.
2. Create a free **Expo account** and run `npx eas login` inside `apps/mobile`.
3. `npx eas build --platform ios` / `--platform android` — builds signed binaries in the cloud (no local Xcode/Android Studio needed for this step).
4. `npx eas submit --platform ios` / `--platform android` — submits to App Store Connect / Play Console for review.

Until that's done, the PWA (already fully working, installable, and indistinguishable from a native app to a user) is the real distribution channel — that's what the marketing site links to today.

## What's deliberately not built yet

Per the MVP scope, these are intentionally out — the schema and provider interfaces don't block adding them, they're just not wired up:

- Real Stripe / TWINT / Apple Pay / Google Pay (the `PaymentProvider` interface + a `MockPaymentProvider` exist; a real adapter is a new class)
- Real forecourt/pump hardware integration (same story for `FuelStationProvider`)
- Fleet management, business billing, loyalty redemption (DB tables exist as stubs: `business_accounts`, `business_users`, `loyalty_accounts`, `loyalty_transactions`)
- EV charging / parking / other mobility services
- Translated content for FR/IT/EN (currently German-only UI strings; no hardcoded-string blockers to adding i18n)
- Native iOS/Android builds and App Store/Play Store listings (build profiles are ready in `apps/mobile/eas.json`; publishing needs your own Apple/Google developer accounts — see "Path to real iOS / Android store listings" above)
- App icon / logo artwork (currently the default Expo placeholder icon — visual branding was deprioritized behind the transaction engine, security, and the core flow per the stated priority order)
- Postgres/Supabase (currently SQLite via `node:sqlite` for a zero-dependency local dev story; the schema is plain SQL and the repository layer is a thin wrapper, so migrating is a driver swap, not a rewrite)

## Known rough edges

- `npm audit` reports vulnerabilities in transitive dev/build dependencies (typical for the current React Native/Expo ecosystem) — not reviewed line-by-line in this pass.
- The service worker (`apps/mobile/public/sw.js`) is a minimal network-first shell for PWA installability; a production export should layer on Workbox precaching for real offline support (see comments in that file).
- No automated E2E test suite yet — verification so far is the domain unit tests (`npm run test:domain`) plus manual/scripted flows.
