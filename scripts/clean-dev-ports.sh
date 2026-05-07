#!/usr/bin/env bash
# Proje ile ilişkili Docker compose'u durdurur, yaygın Next/Nest portlarını boşaltır.
# Tüm Docker motorunu kapatmak için: STOP_ALL_DOCKER=1 bash scripts/clean-dev-ports.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== docker compose down (SoftShopping) ==="
docker compose down 2>/dev/null || true

free_listen_port() {
    local port=$1
    local pids
    pids="$(lsof -t -iTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "${pids}" ]]; then
        echo "Port ${port}: sonlandırılıyor (lsof PIDs: ${pids})"
        # shellcheck disable=SC2086
        kill -9 ${pids} 2>/dev/null || true
    else
        fuser -k "${port}/tcp" 2>/dev/null || true
    fi
}

echo "=== Yerel dev portları (3000–3002, 4000–4001) ==="
for p in 3000 3001 3002 4000 4001; do
    free_listen_port "$p" || true
done

if [[ "${STOP_ALL_DOCKER:-}" == "1" ]]; then
    echo "=== STOP_ALL_DOCKER=1: çalışan tüm konteynerler ==="
    running="$(docker ps -q 2>/dev/null || true)"
    if [[ -n "${running}" ]]; then
        # shellcheck disable=SC2086
        docker stop ${running}
    else
        echo "(çalışan konteyner yok)"
    fi
fi

echo "=== Dinleyen soketler (özet) ==="
if command -v ss >/dev/null 2>&1; then
    ss -tlnp 2>/dev/null | grep -E ':3000|:3001|:4000|:4001|:5432|:5433|:6379|:6380' || echo "(bu portlarda dinleyen yok)"
else
    echo "(ss komutu yok; atlandı)"
fi

echo "=== Bitti ==="
