# SoftShopping — Genel Sistem Raporu

**Versiyon:** 1.0  
**Tarih:** 7 Mayıs 2026  
**Proje Kökü:** `/home/azem/projects/shopping`  
**Git Repo:** SoftShopping — Giyim perakende için çok kiracılı (multi-tenant) SaaS POS platformu

---

## İçindekiler

1. [Proje Özeti ve Amaç](#1-proje-özeti-ve-amaç)
2. [Teknoloji Stack](#2-teknoloji-stack)
3. [Sistem Mimarisi](#3-sistem-mimarisi)
4. [Veritabanı Mimarisi](#4-veritabanı-mimarisi)
5. [API Tasarımı ve Uç Noktaları](#5-api-tasarımı-ve-uç-noktaları)
6. [Kimlik Doğrulama ve Yetkilendirme](#6-kimlik-doğrulama-ve-yetkilendirme)
7. [Kampanya Motoru](#7-kampanya-motoru)
8. [Finansal ve Kasa Yönetimi](#8-finansal-ve-kasa-yönetimi)
9. [Depolama ve Medya Yönetimi](#9-depolama-ve-medya-yönetimi)
10. [Web ve Mobil İstemciler](#10-web-ve-mobil-istemciler)
11. [DevOps ve Altyapı](#11-devops-ve-altyapı)
12. [Güvenlik Mimarisi](#12-güvenlik-mimarisi)
13. [Test Stratejisi](#13-test-stratejisi)
14. [Raporlama ve Gözlemlenebilirlik](#14-raporlama-ve-gözlemlenebilirlik)
15. [Sistem Modülleri Özeti](#15-sistem-modülleri-özeti)

---

## 1. Proje Özeti ve Amaç

### 1.1 Nedir?

**SoftShopping**, tekstil ve giyim perakendesi için geliştirilmiş, **çok kiracılı (multi-tenant)** bulut tabanlı bir POS (Satış Noktası) ve yönetim platformudur. Tek bir kurulumda birden fazla mağaza/şirkete (tenant) hizmet verecek şekilde tasarlanmıştır.

### 1.2 Temel Amacı

- Mağazaların **stok, satış, cari hesap, kasa ve raporlama** süreçlerini tek bir merkezden yönetmesi
- **Varyasyonlu ürün** desteği (renk + beden kombinasyonları, barkod bazlı stok)
- **Kampanya ve indirim** yönetimi (3 al 2 öde, yüzde indirim, sepet kampanyaları)
- **Cari hesap** takibi (müşteri/supplier borç-alacak, vadeli satış)
- **Kasa yönetimi** (oturum bazlı kasiyer takibi, nakit/kredi kartı/havale)
- **Çok şubeli** yapı desteği (şubeler arası stok transferi)

### 1.3 Hedef Kullanıcılar

| Rol | Açıklama |
|-----|----------|
| **Tenant Admin** | Mağaza yöneticisi — tüm modüllere tam erişim |
| **Store Manager** | Mağaza müdürü — satış, stok, raporlama |
| **Senior Sales** | Kıdemli satış danışmanı — indirimli satış yetkisi |
| **Sales Staff** | Satış personeli — standart satış |
| **Cashier** | Kasiyer — sınırlı yetki |
| **Accountant** | Muhasebe — finans ve raporlama |
| **Super Admin** | Sistem yöneticisi — tüm kiracılara erişim |

### 1.4 Demo Erişim Bilgileri

| Alanan | Değer |
|--------|-------|
| E-posta | `info@azemyazilim.com` |
| Şifre | `1212` |
| Tenant Kodu | `DEM` |

---

## 2. Teknoloji Stack

### 2.1 Backend (API)

| Bileşen | Teknoloji | Versiyon |
|---------|-----------|----------|
| Runtime | Node.js | >= 20 LTS |
| Framework | NestJS | ^10.4.x |
| Dil | TypeScript | ^5.5 |
| ORM | Prisma | ^5.19 |
| Veritabanı | PostgreSQL | 16 |
| Cache & Queue | Redis | 7 (BullMQ ^5.12) |
| WebSocket | Socket.io | ^4.8 |
| HTTP Client | Axios | ^1.16 |
| Şifreleme | bcrypt | ^5.1 |
| Loglama | Winston | ^3.19 |
| Hata İzleme | Sentry | ^10.51 |
| Dosya Upload | AWS S3 SDK | ^3.700 |

### 2.2 Frontend (Web)

| Bileşen | Teknoloji | Versiyon |
|---------|-----------|----------|
| Framework | Next.js | 16.2.4 (App Router) |
| UI | React | 19.2.0 |
| Stillendirme | Tailwind CSS | v4 |
| Bileşen Kütüphanesi | shadcn/ui + Base UI | — |
| State Management | Zustand | ^5.0.12 |
| Server State | TanStack Query | ^5.100.9 |
| HTTP Client | Axios | ^1.16 |

### 2.3 Mobil (React Native / Expo)

| Bileşen | Teknoloji | Versiyon |
|---------|-----------|----------|
| Framework | Expo | SDK 55 |
| Runtime | React Native | 0.83.6 |
| Navigasyon | React Navigation | v7 |
| State | Zustand | ^4.5.7 |
| Offline Storage | MMKV (expo-nitro-modules) | — |
| Kamera/Barkod | expo-camera | ~55.0 |
| Biyometrik | expo-local-authentication | ~55.0 |
| Secure Storage | expo-secure-store | ~55.0 |

### 2.4 Altyapı

| Bileşen | Teknoloji |
|---------|-----------|
| Container | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Objektif Depolama | MinIO (yerel) / Cloudflare R2 (üretim) |
| Reverse Proxy | NGINX |

---

## 3. Sistem Mimarisi

### 3.1 Genel Mimari

```
┌─────────────────────────────────────────────────────┐
│                    İnternet                          │
│                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│  │  Web App  │    │ Mobil App │    │  API   │      │
│  │(Next.js)  │    │  (Expo)   │    │(NestJS) │      │
│  │ :3000     │    │  :8081    │    │ :4000   │      │
│  └─────┬─────┘    └─────┬─────┘    └────┬────┘      │
│        │                  │                  │          │
│        └──────────────────┴──────────────────┘          │
│                         │                                │
│              ┌──────────┴──────────┐                    │
│              │   NGINX (ops.)      │                    │
│              └──────────┬──────────┘                    │
│                         │                                │
│         ┌───────────────┼───────────────┐             │
│         │               │               │               │
│    ┌────▼────┐    ┌────▼────┐   ┌────▼────┐         │
│    │PostgreSQL│    │  Redis  │   │   S3/R2  │         │
│    │  :5432  │    │  :6379  │   │ Storage  │         │
│    └─────────┘    └─────────┘   └──────────┘         │
└─────────────────────────────────────────────────────┘
```

### 3.2 Monorepo Yapısı

```
textile-pos/
├── apps/
│   ├── api/              # NestJS Backend
│   │   ├── prisma/       # Schema + migrations + seed
│   │   └── src/
│   │       ├── common/   # Shared: guards, decorators, interceptors, services
│   │       └── modules/  # Feature modules (auth, product, sales, ...)
│   ├── web/              # Next.js 16 Frontend
│   │   └── src/
│   │       ├── app/      # App Router pages
│   │       ├── components/ # UI components
│   │       ├── lib/      # API client, formatters
│   │       └── stores/   # Zustand state stores
│   └── mobile/           # Expo/React Native
│       └── src/
│           └── screens/   # Screen components
├── packages/
│   └── shared-types/     # Ortak TypeScript tipleri
├── docs/                 # Dokümantasyon
├── scripts/              # Yardımcı scriptler
└── docker-compose.yml    # Geliştirme ortamı
```

### 3.3 Monorepo Komutları

```bash
# Geliştirme
npm run dev:api          # API'yi başlat
npm run dev:web          # Web'i başlat
npm run dev:all          # Her ikisini birden

# Build
npm run build:api        # API build
npm run build:web        # Web build

# Veritabanı
npm run db:migrate       # Migration uygula
npm run db:seed          # Seed data yükle

# Docker
npm run docker:dev       # Tam stack (postgres + redis + api + web)
npm run docker:db        # Sadece DB + Redis
npm run docker:down       # Tümünü durdur

# Sağlık kontrolü
npm run check:api         # API health endpoint
```

---

## 4. Veritabanı Mimarisi

### 4.1 PostgreSQL Schema — 27 Tablo

#### Kural Seti (Mimari Zorunluluklar)

| Kural | Açıklama |
|-------|----------|
| **Tenant İzolasyonu** | Her iş tablosunda `tenantId UUID NOT NULL` zorunlu |
| **Soft Delete** | Tüm iş tablolarında `deletedAt`, `deletedBy`, `isDeleted` — ** kesinlikle hard delete YOK** |
| **Optimistic Locking** | `product_variants` ve `orders` tablolarında `version Int` kolonu |
| **Para Alanları** | `Decimal(12,2)` — float/asma nokta kesinlikle YASAK |
| **KDV Oranları** | %0 (ihracat), %10 (çocuk giyim), %20 (genel) |

#### Veritabanı Modelleri

##### Auth & Tenant
| Model | Açıklama |
|-------|----------|
| `Tenant` | Kiracı/organizasyon tanımı |
| `User` | Sistem kullanıcısı |
| `RefreshToken` | JWT yenileme token'ları |

##### Ürün & Katalog
| Model | Açıklama |
|-------|----------|
| `Product` | Ana ürün tanımı |
| `ProductVariant` | Varyasyon (renk + beden + barkod) |
| `ProductCategory` | Kategori hiyerarşisi (parent-child) |
| `ProductBrand` | Marka tanımı |
| `ProductColor` | Renk tanımı |
| `SizeSet` | Beden seti (örn. XS,S,M,L,XL) |

##### Stok & Envanter
| Model | Açıklama |
|-------|----------|
| `StockMovement` | Stok hareketleri (satış, iade, alış, transfer, rezervasyon) |

##### Satış & Ödeme
| Model | Açıklama |
|-------|----------|
| `Order` | Satış siparişi |
| `OrderItem` | Sipariş kalemleri |
| `Payment` | Ödeme kayıtları |

##### Kampanya
| Model | Açıklama |
|-------|----------|
| `Campaign` | Kampanya tanımı |

##### Cari Hesap
| Model | Açıklama |
|-------|----------|
| `Customer` | Müşteri/tedarikçi (borç-alacak takibi) |
| `LedgerMovement` | Cari hareket (satış, iade, ödeme, tahsilat) |

##### Kasa
| Model | Açıklama |
|-------|----------|
| `CashRegisterSession` | Kasa oturumu (açılış, kapanış, raporlama) |
| `CashRegisterAdjustment` | Kasa düzeltme kayıtları |

##### Finans
| Model | Açıklama |
|-------|----------|
| `BankAccount` | Banka hesapları (vadesiz, POS, kredi kartı) |
| `BankAccountMovement` | Banka hareketleri |
| `PartnerFinanceOperation` | Cari ödeme/tahsilat operasyonları |

##### Hediye Çeki
| Model | Açıklama |
|-------|----------|
| `GiftVoucher` | Hediye çeki |

##### Etiket
| Model | Açıklama |
|-------|----------|
| `LabelTemplate` | Yazıcı etiket şablonları (ZPL, PDF) |

##### Diğer
| Model | Açıklama |
|-------|----------|
| `Expense` | Gelir/Gider kayıtları |
| `ExpenseCategory` | Gelir/Gider kategorileri |
| `Branch` | Şube tanımı |
| `StockTransfer` | Şubeler arası stok transferi |
| `StockTransferItem` | Transfer kalemleri |
| `Integration` | E-ticaret entegrasyonları (Trendyol, Hepsiburada, N11, Amazon) |
| `SalesTarget` | Personel satış hedefleri |
| `Notification` | Bildirimler |
| `AuditLog` | Denetim kayıtları (tüm mutasyonlar) |

### 4.2 Kritik Veritabanı Özellikleri

#### Para Hesaplamaları
- Tüm para alanları `Decimal(12,2)` — toplama ve çıkarma işlemlerinde hassasiyet korunur
- KDV her satış anında hesaplanır
- Minimum stok seviyesi varyasyon bazlı ayarlanabilir

#### Stok Hareket Tipleri
```
PURCHASE   → Stok girişi
SALE       → Satış çıkışı
RETURN     → İade girişi
ADJUSTMENT → Manuel düzeltme
TRANSFER   → Şube transferi
RESERVATION→ Sepet rezervasyonu
RELEASE    → Rezervasyon iptali
```

#### Sipariş Durumları
```
PENDING          → Bekleyen
COMPLETED        → Tamamlandı
PARTIALLY_RETURNED → Kısmen iade
FULLY_RETURNED   → Tamamen iade
CANCELLED        → İptal
```

---

## 5. API Tasarımı ve Uç Noktaları

### 5.1 API Genel Yapısı

| Özellik | Değer |
|---------|-------|
| Base URL | `/api/v1` |
| Versiyonlama | URI bazlı (`/api/v1/...`) |
| Kimlik Doğrulama | JWT Bearer Token |
| Tenant Header | `x-tenant-id` |
| Response Format | `{ data, meta }` (GlobalResponseInterceptor) |
| Rate Limiting | Profile bazlı (AUTH, BARCODE, REPORT, DEFAULT) |

### 5.2 Ana Endpoint Kategorileri

| Modül | Prefix | Açıklama |
|-------|--------|----------|
| Auth | `/auth` | Login, register, refresh, logout |
| Products | `/products` | CRUD, barkod lookup, görsel upload |
| Catalog | `/catalog` | Kategori, marka, renk, beden seti |
| Inventory | `/inventory` | Stok hareketleri, özet, uyarılar |
| Sales | `/sales` | Checkout, iade, siparişler |
| Customers | `/customers` | Cari hesap, ekstre, hareketler |
| Campaigns | `/campaigns` | Kampanya CRUD, hesaplayıcı, çek |
| Gift Vouchers | `/gift-vouchers` | Hediye çeki yönetimi |
| Cash Register | `/cash-register` | Kasa oturumları |
| Expenses | `/expenses` | Gelir/Gider kayıtları |
| Bank Accounts | `/bank-accounts` | Banka hesapları, hareketler |
| Partner Finance | `/partner-finance` | Cari ödeme/tahsilat operasyonları |
| Reporting | `/reports` | Dashboard, günlük raporlar, ölü stok |
| Notifications | `/notifications` | Bildirimler |
| Branches | `/branches` | Şube ve stok transferi |
| Integrations | `/integrations` | E-ticaret entegrasyonları |
| Label Templates | `/label-templates` | Etiket şablonları |
| Staff Performance | `/staff-performance` | Hedefler ve lider tablosu |
| Health | `/health` | Sağlık kontrolü |

### 5.3 Global Response Formatı

```json
// Başarılı yanıt
{
  "data": { ... },
  "meta": {
    "timestamp": "2026-05-07T10:00:00.000Z",
    "requestId": "uuid"
  }
}

// Sayfalamalı yanıt
{
  "data": [ ... ],
  "meta": {
    "timestamp": "2026-05-07T10:00:00.000Z",
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "totalPages": 5
    }
  }
}

// Hata yanıtı
{
  "statusCode": 400,
  "error": "BadRequest",
  "message": "Girilen bilgiler geçersiz",
  "timestamp": "2026-05-07T10:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```

### 5.4 Rate Limiting Profilleri

| Profil | Limit | Pencere | Kullanım |
|--------|-------|---------|----------|
| `AUTH` | 10 istek | 15 dakika | Login, register, refresh |
| `BARCODE` | 300 istek | 1 dakika | Barkod okuma |
| `REPORT` | 20 istek | 1 dakika | Raporlama endpoint'leri |
| `BULK` | 30 istek | 1 dakika | Toplu işlemler |
| `DEFAULT` | 200 istek | 1 dakika | Genel endpoint'ler |

### 5.5 Swagger Dokümantasyonu

API dokümantasyonu NestJS Swagger ile otomatik üretilir:

```
http://localhost:4000/api/docs
```

---

## 6. Kimlik Doğrulama ve Yetkilendirme

### 6.1 JWT Yapısı

| Alan | Değer |
|------|-------|
| Access Token Süresi | 15 dakika |
| Refresh Token Süresi | 30 gün |
| Algoritma | HS256 |
| Token Tipi | Bearer |

### 6.2 Guard Zinciri (Her İstekte)

```
Request
  │
  ▼
AuthGuard('jwt')          → Kimlik doğrulama (JWT geçerli mi?)
  │
  ▼
TenantGuard                → Tenant izolasyonu (token tenantId = header tenantId?)
  │
  ▼
RbacGuard + @Roles()      → Yetkilendirme (rol uygun mu?)
  │
  ▼
Prisma Sorgusu            → tenantId filtreli sorgu
  │
  ▼
AuditInterceptor          → Tüm mutasyonlar kaydedilir
```

### 6.3 Brute Force Koruması

- 5 başarısız giriş denemesi → 15 dakika kilit
- `failedAttempts` ve `lockedUntil` alanları `User` tablosunda

### 6.4 Audit Log

Tüm mutasyonel işlemler (POST, PUT, PATCH, DELETE) `AuditLog` tablosuna kaydedilir:

```typescript
{
  tenantId, userId, entityType, entityId,
  action, oldValue, newValue,
  ipAddress, userAgent, createdAt
}
```

---

## 7. Kampanya Motoru

### 7.1 Kampanya Türleri

| Tür | Açıklama | Örnek |
|-----|----------|-------|
| `X_FOR_Y` | X al Y öde | "3 al 2 öde" |
| `PERCENTAGE` | Yüzde indirim | "%20 indirim" |
| `SECOND_ITEM` | 2. ürüne indirim | "2. ürün %50" |
| `FIXED_AMOUNT` | Sabit indirim | "50 TL indirim" |
| `CATEGORY` | Kategori bazlı | "Üst giyimde %15" |

### 7.2 Kampanya Özellikleri

- **Öncelik** (1-100): Yüksek öncelikli kampanya önce uygulanır
- **Kombine edilebilirlik**: Bazı kampanyalar birlikte kullanılabilir
- **Tarih aralığı**: Başlangıç ve bitiş tarihi
- **Stok yönetimi**: Bedava ürün stoktan tam adet düşülür

### 7.3 Kampanya Hesaplama Örneği (3 Al 2 Öde)

```
Ürünler: 300₺ + 200₺ + 100₺ = 600₺
Müşteri öder: 500₺ (Bedava: 100₺'lik ürün)

Dağıtım:
  300₺ ürün → indirim = 100 × (300/600) = 50₺ → net 250₺
  200₺ ürün → indirim = 100 × (200/600) = 33.33₺ → net 166.67₺
  100₺ ürün → indirim = 100 × (100/600) = 16.67₺ → net 83.33₺
```

---

## 8. Finansal ve Kasa Yönetimi

### 8.1 Kasa Yönetimi

- **Oturum bazlı**: Her kasiyer açılışta kasa açar, kapanışta kapatır
- **Kapanış geri alınamaz**: Para çekme/yatırma ile düzeltme yapılır
- **Döviz desteği**: TL varsayılan, ancak banka hesapları çoklu para birimi

### 8.2 Ödeme Tipleri

| Tip | Açıklama |
|-----|----------|
| `CASH` | Nakit |
| `CREDIT_CARD` | Kredi/banka kartı |
| `BANK_TRANSFER` | Havale/EFT |
| `OPEN_ACCOUNT` | Açık hesap (vadeli) |
| `GIFT_VOUCHER` | Hediye çeki |
| `MIXED` | Karışık ödeme (nakit + kart) |

### 8.3 Cari (Ledger) Hareket Tipleri

```
SALE                 → Satış kaydı
RETURN               → İade kaydı
PAYMENT_CASH         → Nakit tahsilat
PAYMENT_CARD         → Kart tahsilat
PAYMENT_TRANSFER     → Havale tahsilat
PAYMENT_CHECK        → Çek tahsilat
PAYMENT_OUT_CASH     → Nakit ödeme
PAYMENT_OUT_TRANSFER → Havale ödeme
PURCHASE             → Alış
OPENING_BALANCE      → Açılış bakiyesi
ADJUSTMENT           → Düzeltme
DEBIT_VOUCHER        → Borç dekontu
CREDIT_VOUCHER      → Alacak dekontu
```

### 8.4 Banka Hesap Türleri

| Tür | Açıklama |
|-----|----------|
| `CHECKING` | Vadesiz hesap — gelen/giden havale |
| `POS_SETTLEMENT` | POS mutabakat — yalnızca kart tahsilatı |
| `CREDIT_CARD` | Firma kredi kartı — kart ödemesi |

---

## 9. Depolama ve Medya Yönetimi

### 9.1 Objekt Storage

| Ortam | Kullanım |
|-------|----------|
| **MinIO** (yerel) | Geliştirme ortamı |
| **Cloudflare R2** (üretim) | Üretim ortamı |

### 9.2 Upload Akışı

```
Client → API → StorageService → S3/R2/MinIO → URL döner
```

### 9.3 Güvenlik Kontrolleri

- MIME type doğrulaması
- Dosya boyut limiti
- Güvenli dosya yolu oluşturma (UUID-based key)

---

## 10. Web ve Mobil İstemciler

### 10.1 Web Uygulaması (Next.js)

**Kullanılan Port:** `http://localhost:3000` (sabit, AGENTS.md §2.5)

**Ekranlar:**

| Sayfa | Açıklama |
|-------|----------|
| `/login` | Giriş sayfası |
| `/dashboard` | KPI kartları (ciro, iadeler, müşteri, stok) |
| `/products` | Ürün listesi |
| `/products/[id]` | Ürün detay/edit |
| `/products/new` | Yeni ürün |
| `/products/variations` | Varyasyon yönetimi |
| `/products/attributes` | Öznitelik yönetimi |
| `/products/brands` | Marka yönetimi |
| `/products/categories` | Kategori yönetimi |
| `/products/label-designer` | Etiket tasarımı |
| `/pos` | Satış konsolu (barkod + sepet + ödeme) |
| `/customers` | Cari hesap listesi |
| `/customers/[id]` | Cari detay |
| `/customers/[id]/movements` | Cari hareketleri |
| `/gift-vouchers` | Hediye çekleri |
| `/inventory` | Stok hareketleri |
| `/campaigns` | Kampanya yönetimi |
| `/campaigns/new` | Yeni kampanya |
| `/cash-register` | Kasa oturumları |
| `/expenses` | Gelir/Gider kayıtları |
| `/finance/bank-accounts` | Banka hesapları |
| `/finance/operations` | Finans operasyonları |
| `/reports` | Raporlama |
| `/settings` | Sistem ayarları |

### 10.2 State Management (Zustand)

| Store | Sorumluluk |
|-------|------------|
| `useAuthStore` | Kullanıcı, token, oturum |
| `useCartStore` | POS sepet içeriği |
| `useTabStore` | Açık sekme yönetimi |

### 10.3 Mobil Uygulama (Expo)

**Temel Özellikler:**

- Offline-first mimari (MMKV ile lokal önbellek)
- Barkod okuma (expo-camera)
- Bluetooth yazıcı desteği (Star Micronics / Epson TM serisi)
- Biyometrik giriş (Face ID / parmak izi)

**Mevcut Ekranlar:** Auth, ürün listesi, barkod arama, POS/ödeme/fiş, cari, kasa aç/kapa/hareket, stok, gider, kampanya, hediye çeki, raporlar.

---

## 11. DevOps ve Altyapı

### 11.1 Docker Geliştirme Sözleşmesi (AGENTS.md §2.5)

> **Kural:** `postgres` ve `redis` servislerine **host portu açılmaz.** DB ve cache yalnızca Docker içi ağdan erişilir.

| Servis | Host Port | İç Port | Açıklama |
|--------|----------|---------|----------|
| postgres | ❌ Yok | 5432 | Sadece Docker içi ağ |
| redis | ❌ Yok | 6379 | Sadece Docker içi ağ |
| api | 4000 | 4000 | API sunucusu |
| web | 3000 | 3000 | Next.js frontend |
| minio | ❌ (ops.) | 9000 | Objekt storage |
| nginx | 80 (ops.) | 80 | Reverse proxy |

### 11.2 Docker Compose Komutları

```bash
npm run docker:dev    # Tam stack (postgres + redis + api + web)
npm run docker:fresh  # Temiz kurulum
npm run docker:db     # Sadece DB + Redis
npm run docker:down    # Durdur
```

### 11.3 CI/CD (GitHub Actions)

```yaml
Jobs:
  ├── api-build      # NestJS build
  ├── test            # Jest unit testleri
  ├── migration-check # Prisma migration validate
  ├── rls-check       # PostgreSQL RLS policies kontrolü
  └── docker-build    # Docker image build
```

### 11.4 Environment Variables

```
# Veritabanı
DATABASE_URL          → PostgreSQL connection string

# Redis
REDIS_HOST            → Redis host
REDIS_PORT            → Redis port

# JWT
JWT_SECRET            → Access token gizli anahtarı
JWT_REFRESH_SECRET    → Refresh token gizli anahtarı

# Storage (S3/R2/MinIO)
STORAGE_ENDPOINT      → MinIO/S3 endpoint
STORAGE_BUCKET         → Bucket adı
STORAGE_ACCESS_KEY     → Erişim anahtarı
STORAGE_SECRET_KEY     → Gizli anahtar
STORAGE_PUBLIC_URL      → Genel URL prefix

# API
NODE_ENV              → development / production
PORT                  → API port (varsayılan 4000)
CORS_ORIGINS          → İzin verilen origin'ler

# Monitoring
SENTRY_DSN            → Sentry DSN (ops.)
```

---

## 12. Güvenlik Mimarisi

### 12.1 Tenant İzolasyonu

```
┌─────────────────────────────────────────────┐
│           Tenant A'nın Verisi               │
│  • Users, Products, Orders, Customers       │
│  • Sorgu: WHERE tenantId = 'tenant-a-id'  │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│           Tenant B'nin Verisi               │
│  • Users, Products, Orders, Customers       │
│  • Sorgu: WHERE tenantId = 'tenant-b-id'    │
└─────────────────────────────────────────────┘
```

### 12.2 Row Level Security (RLS)

PostgreSQL düzeyinde ek güvenlik katmanı:

```sql
-- Örnek RLS policy
CREATE POLICY tenant_isolation ON orders
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id'));
```

### 12.3 RBAC Matrisi

| İşlem | Super Admin | Tenant Admin | Müdür | Kıd. Satış | Satış | Kasiyer | Muhasebe |
|-------|------------|--------------|-------|------------|-------|---------|----------|
| Satış yap | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| İndirim ver | ✅ | ✅ | ✅ | ✅ | ⚠️ limit | ❌ | ❌ |
| İade işle | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Stok düzelt | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Kasa kapat | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Rapor gör | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Maliyet gör | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Kullanıcı yönet | ✅ | ✅ | ⚠️ kısıtlı | ❌ | ❌ | ❌ | ❌ |

---

## 13. Test Stratejisi

### 13.1 Test Katmanları

| Seviye | Kapsam | Araç |
|--------|--------|------|
| Birim Testleri | Servis, guard, interceptor, middleware | Jest |
| Entegrasyon Testleri | API endpoint'leri (controller seviyesi) | Jest + supertest |
| E2E Testleri | Tam akış (login → satış → rapor) | Playwright/Cypress |

### 13.2 Kritik Test Senaryoları

- ✅ Tenant A kullanıcısı Tenant B verisine erişemiyor
- ✅ Aynı varyasyonu 2 kasiyer eş zamanlı satarsa optimistic lock çalışıyor
- ✅ Ödeme başarısız olursa stok geri dönüyor (transaction rollback)
- ✅ Kampanya çakışmasında öncelik sırasına göre doğru kampanya seçiliyor
- ✅ Negatif stok izin verilmemişse satış bloke ediliyor
- ✅ Kasa kapanışı sonrası düzenleme bloke ediliyor
- ✅ Yetkisiz rol doğru HTTP 403 alıyor
- ✅ Soft deleted kayıtlar listeleme endpoint'lerinde görünmüyor

---

## 14. Raporlama ve Gözlemlenebilirlik

### 14.1 Rapor Türleri

| Rapor | Açıklama |
|-------|----------|
| Dashboard KPIs | Bugünkü ciro, sipariş, iade, müşteri, düşük stok |
| Günlük Satış | Tarih bazlı satış özeti |
| Ölü Stok | N gün satılmayan ürünler |
| Nakit Kasa | Kasa oturumları ve nakit hareketleri |
| Stok Özeti | Kategori, kritik stok, maliyet değeri |

### 14.2 Tracing

Her API isteğine `x-trace-id` ve `x-span-id` header'ları eklenir:

```json
{
  "traceId": "87c80abca6f7f9f948eef506d816dee5",
  "spanId": "0f92443ea7afce3a",
  "tenantId": "44f207a7-...",
  "method": "POST",
  "url": "/api/v1/auth/login",
  "statusCode": 200,
  "duration": "185ms"
}
```

### 14.3 Logging

- **Format:** JSON (üretim) / Renkli (geliştirme)
- **Kütüphane:** Winston
- **Log seviyeleri:** error, warn, log, debug

---

## 15. Sistem Modülleri Özeti

### 15.1 API Modülleri (21 Modül)

| Modül | Ana Sorumluluk |
|-------|----------------|
| `auth` | Login, logout, register, token yenileme |
| `product` | Ürün CRUD, varyant, barkod, görsel upload |
| `catalog` | Kategori, marka, renk, beden seti |
| `inventory` | Stok hareketleri, özet, uyarılar |
| `sales` | Satış checkout, iade, sipariş yönetimi |
| `campaign` | Kampanya CRUD, hesaplama, çek |
| `customer` | Cari hesap, ekstre, hareketler |
| `gift-voucher` | Hediye çeki üretimi ve kullanımı |
| `cash-register` | Kasa oturumu aç/kapa/düzelt |
| `expense` | Gelir ve gider kayıtları |
| `reporting` | Dashboard, raporlar |
| `notification` | Bildirim sistemi |
| `branch` | Şube ve transfer yönetimi |
| `integration` | E-ticaret entegrasyonları |
| `partner-finance` | Banka ve finans operasyonları |
| `label-template` | Etiket şablonları (ZPL) |
| `receipt` | Fiş üretimi |
| `staff-performance` | Satış hedefleri ve lider tablosu |
| `health` | Sağlık kontrolü |
| `storage` | Objekt storage (S3/R2/MinIO) |
| `events` | WebSocket gateway + Domain Event Bus |

### 15.2 Web Ekranları (29 Sayfa)

Dashboard, POS, ürün (liste/detay/yeni/özellikler), varyasyonlar, kategoriler, markalar, etiket tasarımı, müşteriler (liste/detay/hareketler), kampanyalar, hediye çekleri, envanter, kasa, giderler, banka hesapları, finans operasyonları, raporlar, ayarlar.

---

## 16. Proje Durumu ve Yol Haritası

### Tamamlanan Özellikler

- ✅ Çok kiracılı mimari (tenant isolation)
- ✅ Varyasyonlu ürün ve barkod sistemi
- ✅ POS satış konsolu
- ✅ Kampanya motoru (5 tür)
- ✅ Cari hesap ve ledger sistemi
- ✅ Kasa oturum yönetimi
- ✅ Gelir/Gider kayıtları
- ✅ Banka hesapları ve hareketleri
- ✅ Finans operasyonları
- ✅ Hediye çeki sistemi
- ✅ Etiket şablonları
- ✅ Şube ve stok transferi
- ✅ E-ticaret entegrasyonları (iskelet)
- ✅ Bildirim sistemi
- ✅ Performans hedefleri
- ✅ Soft delete (tüm iş tabloları)
- ✅ Optimistic locking (orders, variants)
- ✅ Rate limiting (profile bazlı)
- ✅ Global response interceptor
- ✅ Redis cache-aside
- ✅ WebSocket gateway
- ✅ MinIO/S3 objekt storage
- ✅ Sentry hata izleme (iskelet)
- ✅ Winston structured logging
- ✅ RLS policy kontrolü (CI)
- ✅ Prisma migration CI kontrolü

### Geliştirme Aşamasında

- 🔄 WebSocket entegrasyonu (frontend hook'ları)
- 🔄 API versioning (v2 endpoint'leri)
- 🔄 Campaign conflict resolver (detaylı)
- 🔄 Tam observability stack (Sentry + Grafana + OpenTelemetry)
- 🔄 E2E test kapsamı

### Planlanan

- 📋 Masaüstü uygulaması (Electron — iskelet mevcut)
- 📋 TOTP 2FA
- 📋 Tam DR runbook operasyonel süreçleri
- 📋 Üretim R2/Sentry/Grafana konfigürasyonları

---

## 17. Erişim Bilgileri

### Geliştirme Ortamı

| Servis | URL |
|--------|-----|
| Web Uygulaması | http://localhost:3000 |
| API | http://localhost:4000 |
| Swagger Docs | http://localhost:4000/api/docs |
| Health Check | http://localhost:4000/api/v1/health |
| API Health Script | `npm run check:api` |

### Docker Ortamı

```bash
# Tam stack başlatma
npm run docker:dev

# DB + Redis sadece
npm run docker:db

# Sağlık kontrolü
docker compose ps
docker compose logs api --tail 80
```

### Demo Hesap

```
E-posta: info@azemyazilim.com
Şifre: 1212
Tenant: DEM (Demo Mağaza)
Rol: TENANT_ADMIN
```

---

*Bu rapor SoftShopping projesinin mevcut durumunu ve teknik altyapısını özetler. Detaylı API dokümantasyonu için Swagger (http://localhost:4000/api/docs) kullanılmalıdır.*
