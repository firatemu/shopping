FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
RUN npm install --workspace=apps/api

COPY apps/api/ ./apps/api/
COPY tsconfig.base.json ./

RUN cd apps/api && npx prisma generate
RUN npm run build --workspace=apps/api

FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/

USER nestjs

EXPOSE 4000

CMD ["node", "apps/api/dist/main"]
