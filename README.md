# River Fitness

One app for nutrition, training, and rest coaching. Client side + coach side + hidden admin, role-gated, one codebase (Expo / React Native + RN Web → iOS, Android, browser).

Spec of record: `spec/app-spec.md` in the Claude project. Build history: `spec/build-log.md`.

## Stack
- Expo + expo-router (TypeScript strict)
- Supabase (Postgres + Auth + RLS) — project `ylholksizarydbbrceut`
- Dark default; design tokens in `src/theme/tokens.ts` (Fibonacci spacing, √φ type scale, domain colors, golden angle)

## Structure
```
app/               expo-router routes
  sign-in.tsx      invite-only sign in
  index.tsx        role router (coach → /coach, client → /client)
  client/          Today (log + totals vs targets), Weeks (phyllotaxis + week cards), Plan (targets, instructions, reviews)
  coach/           Client list w/ triage flags, client detail (14 days + program weeks)
src/theme/         tokens (primitives → semantic → component layers)
src/lib/           supabase client + GENERATED database types (npm run gen:types)
src/data/          the ONLY data-access module — no raw supabase calls in components
src/components/    ui primitives + Phyllotaxis (signature streak visual)
```

## Rules (from the spec — do not violate)
- Derived numbers come from SQL views only; never recompute streaks/summaries in JS.
- All queries go through `src/data`. Components never import supabase directly.
- Domain colors are semantic (nutrition green / coaching blue / sleep navy / training ember). Signal colors (success/error/attention-yellow) are separate and never used as domain accents.
- Additive migrations only; every view `security_invoker = true`.
- Client-generated UUIDs; inserts are idempotent upserts on id.

## Run
```
npm install
npm run typecheck
npx expo start        # then i / a / w
```

## First sign-in (coach)
1. Supabase Dashboard → Authentication → Add user → the coach email allowlisted in the `coach_bootstrap` migration, choose a password, auto-confirm ON.
2. A bootstrap trigger grants the coach role + client relationships automatically on creation.
3. Sign into the app with that email/password → lands on the coach side.

Seeded clients are unclaimed; the claiming flow comes with invites.

## Hosted web build (phone browser)
Every push to `main` runs `.github/workflows/deploy-web.yml`: typecheck → `expo export --platform web` → publish to GitHub Pages. The site lives at `https://<owner>.github.io/river-fitness/`.

Sub-path hosting is handled by `EXPO_BASE_URL` (set to `/river-fitness` in CI, empty locally), read by `app.config.js` and `scripts/postexport.js`. Local and desktop builds stay root-relative — don't hardcode the base path anywhere else.

## PWA (any machine, free)
`npm run build:web` produces `dist/` with manifest + service worker + icons. Serve it over https (or localhost) and use the browser's **Install app** button — standalone window, taskbar icon, no browser chrome.

## Desktop app (Windows)
The Tauri scaffold lives in `src-tauri/` (free, open-source; ships a real .exe using the WebView2 already on Windows 10/11).

One-time setup on the PC:
1. Install Rust: https://rustup.rs (default options)
2. Install "Desktop development with C++" via Visual Studio Build Tools
3. `npm install` in this repo (pulls @tauri-apps/cli)

Build: `npm run desktop:build` → installer lands in `src-tauri/target/release/bundle/nsis/River Fitness_0.1.0_x64-setup.exe`. Dev mode with hot reload: `npm run desktop:dev`.
