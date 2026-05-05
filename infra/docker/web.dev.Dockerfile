FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY apps/web ./apps/web
COPY apps/api/package.json ./apps/api/
COPY packages ./packages

RUN npm install

ENV NODE_ENV=development

EXPOSE 3000

WORKDIR /app/apps/web

CMD ["npx", "next", "dev", "--hostname", "0.0.0.0", "--port", "3000"]
