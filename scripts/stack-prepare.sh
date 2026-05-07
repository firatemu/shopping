#!/usr/bin/env bash
# SoftShopping — yerel geliştirme: Postgres/Redis + migrasyon + Prisma client
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Docker: postgres + redis"
docker compose up -d postgres redis

echo "==> Postgres hazır olana kadar bekleniyor..."
for i in $(seq 1 40); do
  if docker compose exec -T postgres pg_isready -U "${DB_USER:-textilepos}" >/dev/null 2>&1; then
    echo "    Postgres hazır."
    break
  fi
  if [[ "$i" -eq 40 ]]; then
    echo "HATA: Postgres yanıt vermiyor. 'docker compose logs postgres' ile kontrol edin." >&2
    exit 1
  fi
  sleep 1
done

echo "==> Prisma migrate deploy"
npm run db:migrate

echo "==> Prisma generate"
npm exec --workspace=apps/api -- prisma generate

echo ""
echo "Tamam. API:  npm run dev:api"
echo "      Web:  npm run dev:web"
