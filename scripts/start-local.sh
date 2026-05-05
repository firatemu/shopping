#!/bin/bash
# =============================================
# TextilePOS — Local Development Startup Script
# =============================================
# Kullanım: sudo bash scripts/start-local.sh
# Bu script: Redis kurar, PostgreSQL DB oluşturur, migration çalıştırır,
# API ve Frontend'i başlatır.

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 TextilePOS Local Development Startup${NC}"
echo "=========================================="

# Step 1: Redis kurulumu (eğer yoksa)
echo -e "\n${YELLOW}[1/6] Redis kontrol ediliyor...${NC}"
if ! command -v redis-server &> /dev/null; then
    echo "Redis kurulumu yapılıyor..."
    apt-get update -qq && apt-get install -y -qq redis-server redis-tools
    echo "Redis kuruldu ✅"
else
    echo "Redis zaten kurulu ✅"
fi

# Step 2: Redis başlat
echo -e "\n${YELLOW}[2/6] Redis başlatılıyor...${NC}"
if ! pgrep -x redis-server > /dev/null; then
    redis-server --daemonize yes --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    echo "Redis başlatıldı (port 6379) ✅"
else
    echo "Redis zaten çalışıyor ✅"
fi
redis-cli ping

# Step 3: PostgreSQL kontrol & DB oluştur
echo -e "\n${YELLOW}[3/6] PostgreSQL veritabanı kontrol ediliyor...${NC}"
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw textilepos; then
    echo "textilepos veritabanı oluşturuluyor..."
    sudo -u postgres psql -c "CREATE USER textilepos WITH PASSWORD 'textilepos_dev_pass';" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE DATABASE textilepos OWNER textilepos;" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE textilepos TO textilepos;" 2>/dev/null || true
    echo "Veritabanı oluşturuldu ✅"
else
    echo "textilepos veritabanı zaten mevcut ✅"
fi

# Step 4: Prisma migration
echo -e "\n${YELLOW}[4/6] Prisma migration çalıştırılıyor...${NC}"
cd /home/azem/projects/shopping
export DATABASE_URL="postgresql://textilepos:textilepos_dev_pass@localhost:5432/textilepos?schema=public"

# Switch to regular user for npm commands
sudo -u azem bash -c "cd /home/azem/projects/shopping/apps/api && npx prisma generate && npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss"
echo "Migration tamamlandı ✅"

# Step 5: Seed (opsiyonel)
echo -e "\n${YELLOW}[5/6] Seed data kontrol ediliyor...${NC}"
sudo -u azem bash -c "cd /home/azem/projects/shopping/apps/api && npx prisma db seed 2>/dev/null" || echo "Seed atlandı (opsiyonel)"

echo -e "\n${YELLOW}[6/6] Servisler hazır!${NC}"
echo ""
echo "=========================================="
echo -e "${GREEN}✅ Altyapı hazır! Şimdi ayrı terminallerde çalıştırın:${NC}"
echo ""
echo "  Terminal 1 (API):      cd apps/api && npm run start:dev"
echo "  Terminal 2 (Frontend): cd apps/web && npm run dev"
echo ""
echo "  API:      http://localhost:4000/api/v1"
echo "  Swagger:  http://localhost:4000/api/docs"
echo "  Frontend: http://localhost:3000"
echo "=========================================="
