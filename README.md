# GeekBidMobile (Full Modular Build)

React Native (Expo + TypeScript) mobile app for GeekBid, built from `GeekBid_Complete_Plan.docx.md`.

## Modules Implemented

- Auth & role onboarding (`client`, `freelancer`, `admin`)
- Profiles + Geek Score + role switching
- Live job feed with reverse price decay
- Job detail with accept, counter-bid, and watch
- Client job posting with floor validation
- Workspace hub module
- My Jobs module
- My Bids module
- Notifications module (read/unread + mark all)
- Inbox module
- Chat room module
- Earnings module
- Payments & Escrow module
- Admin dashboard module
- Dispute queue module

## Data & Integration Layers

- Shared app state in `src/context/AppContext.tsx`
- API integration layer in `src/services/`
- Socket.IO event integration (`price_update`, `job_accepted`)
- Mock seed data for all modules in `src/data/mockData.ts`

## Environment

Create `.env` from `.env.example`:

```bash
EXPO_PUBLIC_USE_MOCK=true
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/v1
EXPO_PUBLIC_SOCKET_URL=http://localhost:3004
EXPO_PUBLIC_AUTH_TOKEN=
```

Set `EXPO_PUBLIC_USE_MOCK=false` for live backend mode.

## Run

```bash
npm install
npm run android
# or
npm run ios
# or
npm run web
```

## Backend Microservices Scaffold

```bash
cd backend
npm install
npm start
```

Available local services:

- Gateway: `http://localhost:3000/v1/info`
- Auth Service: `http://localhost:3001/v1`
- Job Service: `http://localhost:3003/v1`
- Bidding Service (+ Socket.IO): `http://localhost:3004/v1`
- Payment Service: `http://localhost:3005/v1`
- Notification Service: `http://localhost:3006/v1`
- Chat Service (+ Socket.IO): `http://localhost:3007/v1`

## Test

```bash
npm test
npx tsc --noEmit
npx expo-doctor
npm test -- --coverage
```

Current automated coverage includes:

- Pricing engine utility tests
- Core AppContext module flow tests:
  - Post job
  - Accept job
  - Chat send
  - Escrow release
  - Dispute raise
  - Invalid action validation
- Module UI interaction tests:
  - Feed render in navigation context
  - Profile role cycling
  - Payments escrow release action
  - Chat room send message flow
- Service layer tests:
  - API client request behavior (headers, URL building, envelope/error handling, 204)
  - GeekBid API endpoint mapping + snake_case normalization
  - Socket lifecycle behavior (singleton connect + safe disconnect)

## E2E (Detox Scaffold)

- Config: `.detoxrc.js`
- Tests: `e2e/smoke.e2e.js`

Commands:

```bash
npm run e2e:detox:build:android
npm run e2e:detox:test:android

npm run e2e:detox:build:ios
npm run e2e:detox:test:ios
```

Note: Detox tests are scaffolded and require local native `android/` / `ios/` projects and emulator/simulator setup.

## Production Hardening Included

- Error boundary: `src/components/ErrorBoundary.tsx`
- Structured logger: `src/utils/logger.ts`
- API timeout + network error logging in `src/services/apiClient.ts`
- Environment split files:
  - `.env.development`
  - `.env.staging`
  - `.env.production`
- CI workflow: `.github/workflows/ci.yml` (typecheck + tests + expo-doctor)

## Release Readiness

- App config updated in `app.json`:
  - iOS bundle id + build number
  - Android package + versionCode + permissions
  - deep-link scheme
- EAS build profiles in `eas.json`
- Store + production docs:
  - `docs/AppStoreReadiness.md`
  - `docs/ProductionRunbook.md`

## Validation

- TypeScript compile check passes: `npx tsc --noEmit`
