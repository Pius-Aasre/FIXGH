This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Repository layout

```
ai-service/      FastAPI keyword classifier (primary classifier, port 8000)
backend/         Express + Prisma API (port 3000) — Supabase Postgres
frontend/mobile/ Expo Router app (Expo SDK 57)
frontend/web/    Vite + React Router dashboard — same UI/UX and features as the mobile app
```

`frontend/web` is a **port of the mobile app**, not a separate design. When a mobile
screen changes, mirror the change in `frontend/web` and vice-versa. Shared design
tokens live in `frontend/web/src/index.css` (`--color-gh-red/gold/green/black`) and
match the hex constants in the mobile screens.

## Web dashboard (`frontend/web`)

```bash
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # typecheck + production build
```

- Routes: `/`, `/report`, `/news`, `/profile`, `/auth`, `/dashboard/report/:id`
  (the last one is the deep link embedded in authority alert emails).
- API client: `src/lib/api.ts` mirrors `frontend/mobile/src/lib/api.ts`; both must
  stay in sync with the backend contract.
- Auth: JWT in `localStorage` (`src/lib/auth-store.ts`) — the mobile app keeps it
  in memory only.
- `VITE_API_URL` overrides the backend URL. Unset locally → `http://<hostname>:3000`.

## Backend commands (`backend/`)

```bash
npm run db:migrate   # prisma migrate deploy
npm run seed         # prisma db seed — 40 authorities
npm run digest:dry   # monthly digest dry run (no emails sent)
npm run ai:check     # classifier parity: JS registry vs ai-service/main.py
npm run ai:sync      # regenerate ai-service/main.py static data from the JS registry
```

**The classifier keyword lists are duplicated** between `backend/src/constants/authorities.js`
(+ `backend/src/services/classification-rules.js`) and `ai-service/main.py` because the two
deploy as separate Render rootDirs. `backend/src/constants/authorities.js` is the source of
truth — edit it, then run `npm run ai:sync`. `npm run ai:check` fails when the two drift
apart or when the live AI service and the offline fallback route a report differently.

