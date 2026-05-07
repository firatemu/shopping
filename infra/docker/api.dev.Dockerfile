FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY apps/web/package.json ./apps/web/
COPY packages ./packages

# Copy fonts for PDF Turkish character support
COPY apps/api/fonts ./fonts

RUN npm install \
    && cd apps/api && npx prisma generate

ENV NODE_ENV=development

EXPOSE 4000

CMD ["sh", "-c", "npm run db:migrate --workspace=apps/api && npm run dev --workspace=apps/api"]
