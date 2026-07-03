# ─────────────────────────────────────────────────
# GeekBid Backend — Production Dockerfile
# Runs all 7 microservices via the dev.js orchestrator
# ─────────────────────────────────────────────────
FROM node:20-alpine AS base

# Security: create non-root user
RUN addgroup -g 1001 -S geekbid && \
    adduser -S geekbid -u 1001

WORKDIR /app

# Install dependencies (cache layer)
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY common/ ./common/
COPY services/ ./services/
COPY scripts/ ./scripts/

# Switch to non-root user
USER geekbid

# Health check — 127.0.0.1, not localhost: see web/Dockerfile for why
# (Alpine's musl resolver tries IPv6 first and gets refused with no fallback).
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:${GATEWAY_PORT:-3000}/health || exit 1

# Expose all service ports
EXPOSE 3000 3001 3003 3004 3005 3006 3007

# Start all services
CMD ["node", "scripts/dev.js"]
