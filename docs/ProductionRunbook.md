# Production Runbook

## Environments

- Development: `.env.development`
- Staging: `.env.staging`
- Production: `.env.production`

## Mobile Release Commands

```bash
# Staging build
npx eas build --platform all --profile staging

# Production build
npx eas build --platform all --profile production

# Submit to stores
npx eas submit --platform ios --profile production
npx eas submit --platform android --profile production
```

## Backend Local Run

```bash
cd backend
npm install
npm start
```

## CI Validation

- Typecheck: `npx tsc --noEmit`
- Unit tests: `npm test -- --runInBand --coverage`
- Expo health: `npx expo-doctor`
