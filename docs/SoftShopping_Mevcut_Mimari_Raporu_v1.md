# TextilePOS — Mevcut Sistem Mimari Raporu

**Referans:** `TextilePOS_Mimari_v3.docx` (Versiyon 3.0 — Mayıs 2025) ile aynı bölüm yapısına yakın özet.  
**Bu rapor:** Kod tabanı ve repo gerçekliği (tahmin yok).  
**Tarih:** 2026-05-07  
**Repo kökü:** `textile-pos` monorepo (`apps/api`, `apps/web`, `apps/mobile`)

---

## 1. Proje tanımı ve genel bakış

**TextilePOS**, giyim perakende için çok kiracılı (multi-tenant) stok, satış, cari, kasa ve raporlama odaklı bir platformdur. Hedef dokümandaki vizyonla uyumlu olarak:

| Hedef (v3 doküman) | Mevcut kod tabanı |
|-------------------|-------------------|
| Multi-tenant SaaS | `tenantId` zorunlu model + JWT + guard zinciri; RLS SQL dosyaları mevcut |
| Varyasyonlu ürün | `Product` + `ProductVariant`, barkod, renk/beden |
| Stok / barkod | Envanter modülü, barkod lookup, stok hareketleri |
| Satış konsolu + kampanya | `sales`, `campaign` modülleri; web POS sayfası |
| Cari / kasa / gelir-gider | `customer`, `cash-register`, `expense`, `partner-finance` (banka/operasyon) |
| Raporlama / audit | `reporting`, `AuditInterceptor`, `auditLog` |

**Web App Router ekranları:** login, dashboard, ürün yönetimi (liste, detay, yeni, varyasyonlar, katalog alt sayfaları), POS, cari (liste, detay, hareketler, ekstre önizleme), kampanyalar, stok, kasa, giderler, finans (banka hesapları, operasyonlar), hediye çeki, raporlar, ayarlar vb.

**Mobil (Expo):** auth, ürün, barkod, POS/ödeme/fiş, cari, kasa aç/kapa/hareket, stok, gider, kampanya, hediye çeki, rapor ekranları (`apps/mobile/src/screens`).

---

## 2. Sistem mimarisi

### 2.1 Genel yaklaşım

| Katman | v3 doküman | Mevcut durum |
|--------|------------|--------------|
| Başlangıç | Modüler monolith (NestJS) | **Uyumlu:** tek NestJS uygulaması, modül bazlı (`apps/api/src/modules/*`) |
| API stili | REST + WebSocket | **REST:** global prefix `api/v1`. **WebSocket:** kodda `@nestjs/websockets` / Gateway **bulunamadı** — anlık kasa güncellemesi v3’teki gibi WS ile yapılmıyor |
| Multi-tenant | `tenant_id` satır bazlı | **Uyumlu:** Prisma şemasında iş tablolarında `tenantId`; servislerde filtre kuralı |
| Güvenlik | Uygulama + RLS | **Uygulama:** JWT, `TenantGuard`, RBAC. **RLS:** `prisma/migrations/rls_policies.sql`, `rls_setup.sql` — prod’da uygulanma/otomasyon durumu operasyon kontrolüne bağlı |

### 2.2 İstek güvenlik akışı (özet)

1. `AuthGuard('jwt')` — kimlik  
2. `TenantGuard` + `x-tenant-id` / token uyumu  
3. `RbacGuard` + `@Roles()` — yetki  
4. Prisma sorgularında `tenantId` (proje kuralı)  
5. Audit: global `AuditInterceptor`

---

## 3. Teknoloji stack (paket gerçekleri)

### 3.1 Backend

| Teknoloji | v3 örnek | Repo |
|-----------|----------|------|
| NestJS | v10+ | **^10.4.x** |
| Node | v20 LTS | `engines: >=20` |
| TypeScript | v5+ | Monorepo **5.9.x** (kök), API **^5.5** |
| PostgreSQL | 16 | CI / compose **16-alpine** |
| Redis | 7 | **7-alpine**, BullMQ bağlantısı |
| BullMQ | v4+ | **^5.12** + `@nestjs/bullmq` **^10.2** |
| Prisma | v5+ | **^5.19** |

### 3.2 Frontend (Web)

| Teknoloji | v3 örnek | Repo |
|-----------|----------|------|
| Next.js | v14+ | **16.2.4** (App Router) |
| React | — | **19.2.0** |
| Tailwind | v3+ | **v4** (`@tailwindcss/postcss`) |
| TanStack Query | v5 | **^5.100.9** |
| Zustand | v4 | **^5.0.12** |
| UI | shadcn | shadcn + `@base-ui/react` bileşenleri |

Geliştirme: `next dev -p 3000` (sabit port kuralı). API proxy: `app/api/v1/[[...path]]/route.ts` + `API_DEV_PROXY_TARGET`.

### 3.3 Mobil

Expo / React Native sürümleri `apps/mobile/package.json` içinde (Expo SDK, Navigation v7, vb.). Dokümandaki Expo 50 / RN 0.73 örnekleriyle **doğrudan sürüm eşlemesi yapılmadı** — güncel tek kaynak `package.json`.

### 3.4 Altyapı ve DevOps

| Bileşen | v3 | Repo |
|---------|----|------|
| Docker Compose | Var | Kök `docker-compose.yml` — postgres/redis host portu yok; api + web publish (AGENTS §2.5) |
| GitHub Actions | Var | `.github/workflows/ci.yml` — API build, Jest, migration check |
| NGINX / Hetzner / R2 / Sentry / Grafana | Dokümanda | **Bu repoda** infra dosyaları kısmi (`infra/nginx/`); bulut entegrasyonları çoğunlukla **dokümantasyon / dış pipeline** seviyesinde |

### 3.5 Yazdırma

- API: fiş/şablon (`receipt`, `label-template`), PDF/export (`export.service` vb.)  
- Web: ürün görseli upload → disk `uploads/` + statik servis  
- Mobil: AGENTS’te BLE/Expo Print hedefi tanımlı; v3’teki **node-escpos TCP** detayı bu repoda merkezi olarak doğrulanmadı  

---

## 4. Kimlik doğrulama ve yetkilendirme

| Özellik | v3 | Mevcut |
|---------|----|--------|
| JWT access | 15 dk | `JWT_ACCESS_EXPIRY` (ör. `15m`) |
| Refresh | opaque, rotation | `refreshToken` tablosu + rotation (`auth.service`) |
| Brute force | 5 deneme / 15 dk kilit | `AuthService` — `failedAttempts`, `lockedUntil` |
| Roller | RBAC matrisi | `UserRole` enum: `SUPER_ADMIN` … `ACCOUNTANT` |
| 2FA | Faz 2 | **Kodda standart TOTP akışı aranmadı** (ileri faz) |

---

## 5. Veritabanı mimarisi — kritik kararlar

| Konu | v3 | Mevcut |
|------|----|--------|
| Transaction | Satış atomik | `ProductService` / `SalesService` — `$transaction` / `executeTransaction` kullanımı (satış/stok için kural) |
| Soft delete | Tüm tablolar | Şema yorumları + `softDeleteMiddleware` — **belirli modeller** için otomatik (`SOFT_DELETE_MODELS` listesi); tüm iş tabloları listede olmayabilir — **her model için ayrı kontrol** |
| Optimistic locking | `version` | `product_variants`, `orders` (şema notları) |
| Para | Decimal(12,2) | Prisma `Decimal`; float yasak kuralı |
| KDV | 0 / 10 / 20 | İş kuralları ve seed örnekleriyle uyumlu |
| İndeks | tenant, barkod, vb. | Şema + migration’larda indeksler |

---

## 6. Kampanya motoru

Prisma `CampaignType`: `X_FOR_Y`, `PERCENTAGE`, `SECOND_ITEM`, `FIXED_AMOUNT`, `CATEGORY`.  
v3’teki tüm alt türler ve çakışma kurallarının **tam özellik-paritesi** için `campaign.service` ve testlerle doğrulama gerekir (bu rapor seviyesinde “modül var, detay parity TODO”).

---

## 7. API tasarımı

| Konu | v3 | Mevcut |
|------|----|--------|
| Versiyonlama | `/api/v1` | **Uyumlu:** `setGlobalPrefix('api/v1')` |
| Rate limit | Tenant / barkod / auth / rapor | `ThrottlerModule`: **short** 200/s, **medium** 1000/dk — v3 tablosundaki **ayrı limit profilleri** ile birebir olmayabilir |
| Bulk endpoint’ler | Çeşitli | Ürün/varyasyon toplu işlemler, stok bulk-adjust, barkod lookup vb. **kısmen** mevcut; v3 tablosundaki tüm uçlar için envanter çıkarılmalı |

---

## 8. Önbellek stratejisi

v3’teki katmanlı Redis cache tasarımı (TTL, invalidation kuralları) **bu repoda merkezi bir “cache katmanı” dokümantasyonu olarak kodlanmış değil**. Redis BullMQ ve throttler için kullanılıyor; ürün kataloğu için geniş “cache-aside” implementasyonu **varsayılan olarak doğrulanmadı**.

---

## 9. Kasa yönetimi

Modül: `cash-register`. v3’teki oturum bazlı çoklu kasiyer, kapanışın geri alınamazlığı, düzeltme süreci — **iş kuralları kodda kısmen**; tam parity için `cash-register.service` ve web/mobil akışlarının gözden geçirilmesi önerilir.

---

## 10. Event-driven mimari

v3’te stok/sipariş event’leri. Repoda geniş bir domain event bus (Kafka vb.) **yok**. BullMQ **worker** modülü async işler için kullanılabilir; “event catalog” v3 ile eşleştirilmedi.

---

## 11. Deployment ve DevOps

- **Yerel:** `npm run dev:api`, `npm run dev:web`, `docker:*` script’leri  
- **CI:** API build + unit test + migration check; **web build/lint CI’da zorunlu değil** (ilk job’da yalnız API nest build)  
- **Health:** `/api/v1/health`, graceful shutdown `main.ts` içinde  

---

## 12. Test stratejisi

- Jest unit testler (`apps/api`, örn. `campaign`, `customer`)  
- e2e spec dosyaları (`src/e2e/*`)  
- v3’teki tam test piramidi hedefi için coverage ve web E2E ayrıca planlanmalı  

---

## 13. Monitoring ve gözlemlenebilirlik

- `TracingInterceptor`, `x-trace-id` / `x-span-id` header’ları  
- v3’teki Sentry + Grafana + OpenTelemetry **tam entegrasyon** bu raporda dosya bazında doğrulanmadı (ops/env bağımlı)  

---

## 14. Felaket kurtarma (DR)

v3 bölümüne karşılık bu repoda ayrıntılı DR runbook **yok**; yedekleme/restore operasyonel süreç.

---

## 15. Sistem modülleri (API)

| Modül | Ana sorumluluk |
|-------|----------------|
| `health` | Sağlık |
| `auth` | Giriş, token, kayıt |
| `product` | Ürün, varyant, görsel upload, barkod |
| `catalog` | Kategori, marka, renk, beden seti |
| `inventory` | Stok hareketleri, rezervasyon |
| `sales` | Satış / iade akışı |
| `campaign` | Kampanya |
| `customer` | Cari, ekstre, ödeme/tahsilat |
| `cash-register` | Kasa oturumu |
| `expense` | Gelir/gider |
| `reporting` | Raporlar |
| `gift-voucher` | Hediye çeki |
| `receipt` | Fiş |
| `label-template` | Etiket şablonu |
| `branch` | Şube |
| `staff-performance` | Performans |
| `notification` | Bildirim |
| `integration` | Entegrasyon iskeleti |
| `partner-finance` | Banka hesabı, finans operasyonları (v3 ana başlıklarında kısa geçen “finans”ı genişletir) |

---

## 16. v3 dokümanına göre özet farklar (gap)

1. **WebSocket:** v3 önerisi var; **implementasyon yok** (REST + istemci yenileme).  
2. **RLS:** SQL hazır; **uygulama + operasyonel garanti** ayrı kontrol.  
3. **Cache katmanı:** v3 detaylı; **kodda eşdeğer merkezi strateji sınırlı**.  
4. **Rate limit profilleri:** throttler var; v3’teki endpoint-sınıfına özel tablo ile **eşleşme belirsiz**.  
5. **Soft delete middleware:** tüm modellerde otomatik değil — **SOFT_DELETE_MODELS** alt kümesi.  
6. **CI:** web workspace build/lint **ilk job’da yok** (isteğe bağlı genişletme).  
7. **Observability / DR / R2:** çoğunlukla **hedef mimari**; repo içi kanıt sınırlı.  

---

## 17. Sonuç

Mevcut sistem, **TextilePOS_Mimari_v3** dokümanında tarif edilen **modüler monolith, API-first, multi-tenant SaaS** çizgisinde **uygulanmış bir çekirdektir**. Web ve mobil istemciler, kampanya/satış/stok/cari/kasa/finans modülleri ile dokümandaki ürün kapsamının büyük kısmını karşılar; **WebSocket, ayrıntılı cache politikası, tam kampanya parity, RLS’nin prod kanıtı ve gözlemlenebilirlik stack’i** alanlarında doküman ile **mesafe** vardır.

---

*Bu rapor `docs/TextilePOS_Mevcut_Mimari_Raporu_v1.md` olarak saklanır. DOCX gerekiyorsa Pandoc veya ofis içi dönüştürme ile üretilebilir.*
