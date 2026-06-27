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

# Build arguments for env vars needed at build time
ARG MONGODB_URI
ARG NEXTAUTH_SECRET
ARG NEXTAUTH_URL
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG RAZORPAY_KEY_ID
ARG RAZORPAY_KEY_SECRET

ENV MONGODB_URI=$MONGODB_URI
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
ENV GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
ENV RAZORPAY_KEY_ID=$RAZORPAY_KEY_ID
ENV RAZORPAY_KEY_SECRET=$RAZORPAY_KEY_SECRET

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

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
