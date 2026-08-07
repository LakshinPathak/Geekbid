# App Store Readiness Checklist

## Branding

- [ ] Final app icon exported in required sizes
- [ ] Final splash image exported in required sizes
- [ ] App name and subtitle finalized

## Build & Signing

- [ ] Apple Developer account configured
- [ ] App Store Connect app record created
- [ ] Android Play Console app record created
- [ ] EAS credentials configured for iOS/Android signing
- [ ] Production builds generated (`eas build --profile production`)

## Metadata

- [ ] App description and keyword strategy finalized
- [ ] Screenshots for all required device classes uploaded
- [ ] Privacy policy URL published and linked
- [ ] Support URL published and linked
- [ ] Age rating questionnaire completed

## Compliance

- [ ] Permissions justification validated for Camera/Photos/Notifications
- [ ] Payment terms and dispute policy linked in app/web
- [ ] Data safety form completed (Google Play)
- [ ] App Privacy details completed (App Store)

## Technical Validation

- [x] Unit and module tests passing
- [x] Typecheck passing
- [x] Expo doctor passing
- [ ] Manual QA run on physical iOS and Android devices
- [ ] Crash/analytics integration verified in production mode

## Release

- [ ] Beta rollout (internal testers)
- [ ] Feedback triage and final bugfix pass
- [ ] Submit production build
- [ ] Monitor crash-free session rate for first 72 hours
