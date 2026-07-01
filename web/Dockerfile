# ─────────────────────────────────────────────────
# GeekBid Web — Production Dockerfile (Next.js 16)
# Multi-stage build for minimal image size
# ─────────────────────────────────────────────────

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for env vars needed at build time.
# NEXTAUTH_SECRET in particular throws at module-load time if missing
# (src/lib/auth.ts), and `next build` imports every route module to build
# its manifest — so this list must stay in sync with everything actually
# read via process.env in src/**, and with the `build` job's env block in
# .github/workflows/ci.yml so both build paths behave identically.
ARG MONGODB_URI
ARG NEXTAUTH_SECRET
ARG NEXTAUTH_URL
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG RAZORPAY_KEY_ID
ARG RAZORPAY_KEY_SECRET
ARG NEXT_PUBLIC_RAZORPAY_KEY_ID
ARG CLOUDINARY_CLOUD_NAME
ARG CLOUDINARY_API_KEY
ARG CLOUDINARY_API_SECRET
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ARG NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
ARG GEMINI_API_KEY
ARG AI_MODEL
ARG ADMIN_SECRET_KEY
ARG RESEND_API_KEY

ENV MONGODB_URI=$MONGODB_URI
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
ENV GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
ENV RAZORPAY_KEY_ID=$RAZORPAY_KEY_ID
ENV RAZORPAY_KEY_SECRET=$RAZORPAY_KEY_SECRET
ENV NEXT_PUBLIC_RAZORPAY_KEY_ID=$NEXT_PUBLIC_RAZORPAY_KEY_ID
ENV CLOUDINARY_CLOUD_NAME=$CLOUDINARY_CLOUD_NAME
ENV CLOUDINARY_API_KEY=$CLOUDINARY_API_KEY
ENV CLOUDINARY_API_SECRET=$CLOUDINARY_API_SECRET
ENV NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=$NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ENV NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=$NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
ENV GEMINI_API_KEY=$GEMINI_API_KEY
ENV AI_MODEL=$AI_MODEL
ENV ADMIN_SECRET_KEY=$ADMIN_SECRET_KEY
ENV RESEND_API_KEY=$RESEND_API_KEY

RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Security: create non-root user
RUN addgroup -g 1001 -S geekbid && \
    adduser -S geekbid -u 1001

# Copy only necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=geekbid:geekbid /app/.next/standalone ./
COPY --from=builder --chown=geekbid:geekbid /app/.next/static ./.next/static

USER geekbid

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use 127.0.0.1, not localhost: the Next.js standalone server binds only
# the IPv4 wildcard (HOSTNAME=0.0.0.0), but Alpine's musl resolver tries
# localhost's IPv6 (::1) record first — wget gets an immediate connection
# refused on IPv6 with no IPv4 fallback, so the container reports unhealthy
# even though the app is up and serving fine over IPv4.
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
