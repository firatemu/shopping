# =============================================
# TextilePOS API — Multi-stage Dockerfile
# =============================================

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY apps/api/ apps/api/
COPY tsconfig.json ./

RUN cd apps/api && npx prisma generate
RUN cd apps/api && npx nest build

# Stage 2: Production
FROM node:20-alpine AS production

RUN apk add --no-cache dumb-init
ENV NODE_ENV=production
WORKDIR /app

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./

# Prisma client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost:4000/api/v1/health || exit 1

USER appuser
EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
