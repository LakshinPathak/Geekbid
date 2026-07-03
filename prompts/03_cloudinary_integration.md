Claude Code Prompt: Cloudinary Image Integration for GeekBid

**Task:** Integrate Cloudinary as the image CDN and upload service across the entire GeekBid platform. This covers user avatars (profile photos), testimonial images, and future portfolio/attachment support. The integration should use `next-cloudinary` for the frontend and the `cloudinary` Node.js SDK for server-side signed uploads.

**Design System:** Royal Dark theme — gold `#c9a84c`, bg `#080b14`, panel bg `#0d1120`, text `#f0e8d4`, muted `#a8997e`.

---

## Architecture Overview

```
Frontend (Next.js)                    Backend (API Routes)
┌────────────────────┐               ┌────────────────────────┐
│ CldUploadWidget    │──── signed ──▶│ POST /api/upload/sign  │
│ CldImage           │   upload req  │  (generates signature) │
└────────────────────┘               └────────────────────────┘
         │                                      │
         │ upload direct to                     │ returns
         ▼ Cloudinary CDN                       ▼ signed params
┌────────────────────┐               ┌────────────────────────┐
│ Cloudinary Cloud   │               │ MongoDB: users         │
│ (image storage)    │               │  → avatarUrl field     │
│ res.cloudinary.com │               │  → avatarPublicId      │
└────────────────────┘               └────────────────────────┘
```

---

## Phase 1: Foundation Setup

### 1A. Install Dependencies

```bash
cd web
npm install next-cloudinary cloudinary
```

### 1B. Environment Variables

Add to `.env.local` (and `.env` on deployment):

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=geekbid_unsigned
```

> **Note:** `NEXT_PUBLIC_` prefix makes the cloud name available client-side. The API secret MUST stay server-side only.

### 1C. Cloudinary Account Configuration

On your Cloudinary dashboard:

1. Create an **upload preset** named `geekbid_unsigned` (for simple widget uploads) — set to "Unsigned"
2. Create a **folder** structure: `geekbid/avatars/`, `geekbid/portfolios/`, `geekbid/attachments/`
3. Enable **eager transformations** for avatars: `c_fill,w_200,h_200,g_face,r_max,q_auto,f_auto`
4. Set up **upload restrictions**: max file size 5MB, allowed formats: jpg, png, webp, gif

### 1D. Next.js Config Update

Update `web/next.config.ts` to allow Cloudinary image domains:

```typescript
// In next.config.ts, add to the existing config:
const nextConfig = {
  // ... existing config
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
};
```

---

## Phase 2: Backend — Upload Signature API

### 2A. Create Cloudinary Config Utility

**File:** `web/src/lib/cloudinary.ts`

```typescript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
```

### 2B. Create Signed Upload API Route

**File:** `web/src/app/api/upload/sign/route.ts`

This endpoint generates a signed upload URL so the client can upload directly to Cloudinary securely.

```
POST /api/upload/sign
Headers: Authorization: Bearer <token>
Body: { folder: "geekbid/avatars", uploadPreset?: string }
Response: { signature, timestamp, cloudName, apiKey, folder }
```

Implementation requirements:

- Authenticate the request using `authenticateRequest()` from `@/lib/auth`
- Use `cloudinary.utils.api_sign_request()` to generate the signature
- Include `folder`, `timestamp`, and any transformation params
- Return the signature + params needed by the frontend widget

### 2C. Create Avatar Update API (extend existing `/api/user` PATCH)

**File:** `web/src/app/api/user/route.ts` (modify existing)

Currently at line 51-59, the `allowedFields` array is:

```typescript
const allowedFields = [
  "fullName", "bio", "skills", "company",
  "availability", "hourlyRateMin", "hourlyRateMax",
];
```

Add these fields:

```typescript
const allowedFields = [
  "fullName", "bio", "skills", "company",
  "availability", "hourlyRateMin", "hourlyRateMax",
  "avatarUrl",       // ← NEW: Cloudinary URL
  "avatarPublicId",  // ← NEW: Cloudinary public_id for deletion
];
```

### 2D. Create Image Deletion API Route

**File:** `web/src/app/api/upload/delete/route.ts`

```
DELETE /api/upload/delete
Headers: Authorization: Bearer <token>
Body: { publicId: "geekbid/avatars/user123_abc" }
```

- Authenticate the user
- Verify the publicId belongs to the authenticated user (check user's `avatarPublicId` in DB)
- Call `cloudinary.uploader.destroy(publicId)` to remove the image
- Clear `avatarUrl` and `avatarPublicId` from the user document

---

## Phase 3: Reusable Frontend Components

### 3A. CloudinaryAvatar Component

**File:** `web/src/components/CloudinaryAvatar.tsx`

A drop-in replacement for all the current initials-based avatar circles throughout the app.

**Props:**

```typescript
type CloudinaryAvatarProps = {
  avatarUrl?: string | null;       // Cloudinary URL (if uploaded)
  avatarInitial: string;           // Fallback initials (existing field)
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';  // Predefined sizes
  className?: string;              // Additional classes
  showOnlineIndicator?: boolean;   // Green dot
  isOnline?: boolean;
};
```

**Behavior:**

- If `avatarUrl` exists → render `CldImage` (from next-cloudinary) with face-detection crop, rounded-full
- If no `avatarUrl` → fallback to current initials circle (gold gradient on dark bg)
- Sizes: xs=24px, sm=28px, md=44px, lg=80px, xl=96px
- Apply Royal Dark styling: border `border-[rgba(201,168,76,0.22)]`, bg fallback `bg-[rgba(201,168,76,0.12)]`
- Use `CldImage` props: `width`, `height`, `crop="fill"`, `gravity="face"`, `quality="auto"`, `format="auto"`

**Size map:**

```typescript
const SIZES = {
  xs: { px: 24, text: 'text-[10px]', icon: 'h-3 w-3' },
  sm: { px: 28, text: 'text-xs',     icon: 'h-3.5 w-3.5' },
  md: { px: 44, text: 'text-sm',     icon: 'h-5 w-5' },
  lg: { px: 80, text: 'text-2xl',    icon: 'h-8 w-8' },
  xl: { px: 96, text: 'text-3xl',    icon: 'h-10 w-10' },
};
```

### 3B. AvatarUploader Component

**File:** `web/src/components/AvatarUploader.tsx`

A profile photo upload widget using `CldUploadWidget` from next-cloudinary.

**Props:**

```typescript
type AvatarUploaderProps = {
  currentAvatarUrl?: string | null;
  avatarInitial: string;
  onUploadSuccess: (result: { url: string; publicId: string }) => void;
  onRemove?: () => void;
};
```

**Behavior:**

- Show current avatar (using `CloudinaryAvatar` component) with an overlay camera icon on hover
- Click opens `CldUploadWidget` with:
  - `uploadPreset`: `geekbid_unsigned` (or signed mode)
  - `folder`: `geekbid/avatars`
  - `cropping`: true (enable built-in crop UI)
  - `croppingAspectRatio`: 1 (square)
  - `maxFileSize`: 5MB
  - `sources`: `['local', 'camera', 'url']`
  - `styles`: themed to match Royal Dark (dark widget theme)
- On success: call `onUploadSuccess` with the secure URL and public_id
- Show a "Remove" button if an avatar exists — calls `onRemove`
- Royal Dark styling on the upload button/overlay

---

## Phase 4: Integration Points (All Avatar Locations)

Replace every initials-only avatar with `<CloudinaryAvatar>`. Here's every location:

### 4A. Navbar — `web/src/components/navbar.tsx`

**Lines 106 and 203** — User avatar in the top-right navigation bar

Current:

```tsx
{currentUser.avatarInitial || currentUser.fullName?.slice(0, 2)?.toUpperCase() || "U"}
```

Replace with:

```tsx
<CloudinaryAvatar
  avatarUrl={currentUser.avatarUrl}
  avatarInitial={currentUser.avatarInitial}
  size="sm"
/>
```

### 4B. Profile Page (Own) — `web/src/app/profile/page.tsx`

**Line 151-153** — Large avatar on own profile header

Current:

```tsx
<div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[6px] bg-[rgba(201,168,76,0.12)] ...">
  <span className="font-heading text-3xl ...">{currentUser.avatarInitial}</span>
</div>
```

Replace with:

```tsx
<CloudinaryAvatar
  avatarUrl={currentUser.avatarUrl}
  avatarInitial={currentUser.avatarInitial}
  size="xl"
/>
```

**Add AvatarUploader** in the Edit Profile section (after line 308):

```tsx
<AvatarUploader
  currentAvatarUrl={currentUser.avatarUrl}
  avatarInitial={currentUser.avatarInitial}
  onUploadSuccess={async ({ url, publicId }) => {
    await updateProfile({ avatarUrl: url, avatarPublicId: publicId });
    toast.success("Profile photo updated!");
  }}
  onRemove={async () => {
    // Call delete API, then clear from profile
    await updateProfile({ avatarUrl: "", avatarPublicId: "" });
    toast.success("Profile photo removed");
  }}
/>
```

### 4C. Profile Page (Public) — `web/src/app/profile/[id]/page.tsx`

**Line 104-107** — Avatar on other user's public profile

Replace with `<CloudinaryAvatar>` using the viewed user's `avatarUrl`.

### 4D. Inbox / Chat — `web/src/app/inbox/page.tsx`

**Line 127-133** — Chat room list avatar (sidebar)
**Line 182** — Active chat header avatar

Replace both with `<CloudinaryAvatar size="md">`.

### 4E. Job Card — `web/src/components/job-card.tsx`

**Line 30** — Client avatar on job listing cards

Replace with `<CloudinaryAvatar size="sm">`.

### 4F. Job Detail Page — `web/src/app/jobs/[id]/page.tsx`

**Line 307** — Client avatar in job detail header
**Line 418** — Bidder avatar in bids list
**Line 508** — Bidder avatar in accepted bid section

Replace all three with `<CloudinaryAvatar>`.

### 4G. Talent Pool (Feed) — `web/src/components/feed/TalentPool.tsx`

**Line 104-107** — Freelancer avatar in talent pool cards

Replace with `<CloudinaryAvatar size="md">`.

### 4H. My Jobs Section (Feed) — `web/src/components/feed/MyJobsSection.tsx`

**Line 57-59** — User avatar on job cards in feed

Replace with `<CloudinaryAvatar size="sm">`.

### 4I. Team Page — `web/src/app/team/page.tsx`

**Line 145** — Team member avatar

Replace with `<CloudinaryAvatar size="md">`.

### 4J. Admin Page — `web/src/app/admin/page.tsx`

**Line 244** — User avatar in admin user list

Replace with `<CloudinaryAvatar size="sm">`.

### 4K. Reviews Section (Profile) — `web/src/app/profile/page.tsx`

**Line 233-234** — Reviewer avatar in reviews section

Replace with `<CloudinaryAvatar size="xs">`.

---

## Phase 5: Data Model Updates

### 5A. User Type Update

**File:** `web/src/lib/utils.ts` (line 52-63)

Add to the `User` type:

```typescript
export type User = {
  // ... existing fields
  avatarUrl?: string;        // ← NEW: Cloudinary secure URL
  avatarPublicId?: string;   // ← NEW: Cloudinary public_id (for deletion)
};
```

### 5B. Store Update

**File:** `web/src/lib/store.tsx`

The `updateProfile` action already sends a PATCH to `/api/user`. Just ensure the new fields (`avatarUrl`, `avatarPublicId`) flow through:

1. The `updateProfile` function should accept `avatarUrl` and `avatarPublicId` in its payload
2. After successful update, update the local `currentUser` state with the new avatar URL
3. Also update the user in the `users` array so other components see the change immediately

### 5C. Seed Data Update

**File:** `web/src/lib/data.ts` (lines 10-15)

Add `avatarUrl: ""` and `avatarPublicId: ""` to each seed user so the type is consistent:

```typescript
{ id: "u-client-1", ..., avatarUrl: "", avatarPublicId: "", ... },
```

### 5D. Auth Registration Update

**File:** `web/src/lib/auth.ts`

In `registerUser()` (line 175-196), add:

```typescript
const user = {
  // ... existing fields
  avatarUrl: "",
  avatarPublicId: "",
};
```

In `googleLoginUser()` (line 236-259), the `avatarUrl` field already exists — ensure it maps correctly from Google's profile photo URL. This can be used as an initial avatar before the user uploads a custom one.

---

## Phase 6: Landing Page Testimonials

### 6A. Testimonials Data Update

**File:** `web/src/app/page.tsx` (lines 213-256)

Add `imageUrl` field to each testimonial in the `TESTIMONIALS` array. For now, leave as empty string (the `CloudinaryAvatar` fallback handles it):

```typescript
const TESTIMONIALS = [
  {
    // ... existing fields
    imageUrl: "",  // ← Will be populated with real Cloudinary URLs later
  },
  // ...
];
```

### 6B. Testimonial Card Avatar

**File:** `web/src/app/page.tsx` (line 705-706)

Replace the current initials circle with `<CloudinaryAvatar>`:

```tsx
<CloudinaryAvatar
  avatarUrl={t.imageUrl}
  avatarInitial={t.avatar}
  size="md"
/>
```

---

## Phase 7: Future Extensions (Document for Later)

### 7A. Portfolio Images (Freelancer)

Add a portfolio gallery to freelancer profiles:

- New collection: `portfolios` in MongoDB
- Schema: `{ userId, title, description, imageUrl, publicId, createdAt }`
- Upload via `CldUploadWidget` with folder `geekbid/portfolios/{userId}`
- Display as a responsive grid on the profile page
- Max 10 images per freelancer

### 7B. Job Attachments

Allow clients to attach reference images/docs to job postings:

- New field on `Job` type: `attachments: { url: string; publicId: string; name: string; type: string }[]`
- Upload folder: `geekbid/jobs/{jobId}/attachments`
- Display in job detail page
- Max 5 attachments, 10MB each

### 7C. Chat Image Messages

Allow image sharing in chat:

- Upload folder: `geekbid/chat/{roomId}`
- New message type: `{ type: 'image', imageUrl: string, publicId: string }`
- Inline preview in chat with lightbox on click

---

## Key Files Summary

| File                                          | Action           | Description                                           |
| --------------------------------------------- | ---------------- | ----------------------------------------------------- |
| `web/package.json`                          | Modify           | Add`next-cloudinary` and `cloudinary`             |
| `web/next.config.ts`                        | Modify           | Add Cloudinary image domain                           |
| `web/.env.local`                            | Create/Modify    | Add Cloudinary env vars                               |
| `web/src/lib/cloudinary.ts`                 | **CREATE** | Cloudinary server-side config                         |
| `web/src/app/api/upload/sign/route.ts`      | **CREATE** | Signed upload endpoint                                |
| `web/src/app/api/upload/delete/route.ts`    | **CREATE** | Image deletion endpoint                               |
| `web/src/app/api/user/route.ts`             | Modify           | Add`avatarUrl`, `avatarPublicId` to allowedFields |
| `web/src/components/CloudinaryAvatar.tsx`   | **CREATE** | Reusable avatar component                             |
| `web/src/components/AvatarUploader.tsx`     | **CREATE** | Upload widget component                               |
| `web/src/lib/utils.ts`                      | Modify           | Add avatar fields to User type                        |
| `web/src/lib/store.tsx`                     | Modify           | Flow avatar fields through updateProfile              |
| `web/src/lib/auth.ts`                       | Modify           | Add default avatar fields on registration             |
| `web/src/lib/data.ts`                       | Modify           | Add avatar fields to seed data                        |
| `web/src/components/navbar.tsx`             | Modify           | Replace initials with CloudinaryAvatar                |
| `web/src/app/profile/page.tsx`              | Modify           | Replace avatar + add uploader                         |
| `web/src/app/profile/[id]/page.tsx`         | Modify           | Replace avatar                                        |
| `web/src/app/inbox/page.tsx`                | Modify           | Replace chat avatars                                  |
| `web/src/components/job-card.tsx`           | Modify           | Replace client avatar                                 |
| `web/src/app/jobs/[id]/page.tsx`            | Modify           | Replace 3 avatar locations                            |
| `web/src/components/feed/TalentPool.tsx`    | Modify           | Replace freelancer avatar                             |
| `web/src/components/feed/MyJobsSection.tsx` | Modify           | Replace user avatar                                   |
| `web/src/app/team/page.tsx`                 | Modify           | Replace team member avatar                            |
| `web/src/app/admin/page.tsx`                | Modify           | Replace admin list avatar                             |
| `web/src/app/page.tsx`                      | Modify           | Testimonial avatars                                   |

## Rules

- All avatar changes must gracefully fall back to initials when no `avatarUrl` exists
- Never expose `CLOUDINARY_API_SECRET` on the client side
- Use `CldImage` (not raw `<img>`) for automatic optimization (WebP, responsive sizes)
- Apply `crop="fill"` and `gravity="face"` for all avatar images
- Keep the Royal Dark theme consistent on upload widget (use dark theme option)
- The `CloudinaryAvatar` component must be a single source of truth — no inline avatar rendering anywhere
- Maintain backwards compatibility — existing users with no `avatarUrl` should continue to see initials

