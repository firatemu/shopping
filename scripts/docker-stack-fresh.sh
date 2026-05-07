#!/usr/bin/env bash
# Port temizliği + postgres, redis, api, web konteynerlerini yeniden derleyip ayağa kaldırır.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

bash "$ROOT/scripts/clean-dev-ports.sh"

echo ""
echo "=== docker compose up -d --build postgres redis api web ==="
docker compose up -d --build postgres redis api web

echo ""
echo "=== docker compose ps ==="
docker compose ps

echo ""
echo "=== Yayınlanan portlar (özet) ==="
ss -tlnp 2>/dev/null | grep -E ':3000|:4000|:5432|:5433|:6379|:6380' || true
