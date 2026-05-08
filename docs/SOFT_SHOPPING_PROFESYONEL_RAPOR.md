# SoftShopping — Profesyonel Proje Raporu

**Versiyon:** 1.0
**Tarih:** 8 Mayıs 2026
**Durum:** Geliştirme Aşamasında (Production-Ready Architecture)
**Ekip:** Rol Bazlı Simüle Edilmiş AI Ekip (10 Sanal Uzman)

---

## 1. Proje Özeti

### 1.1 Tanım

**SoftShopping**, tekstil ve giyim perakende mağazaları için tasarlanmış **çok kiracılı (multi-tenant) SaaS POS (Point of Sale) sistemidir**. Mağazaların satış, stok, cari hesap, kampanya ve raporlama işlemlerini tek bir platformdan yönetmelerini sağlar.

### 1.2 Temel Özellikler

| Modül | Açıklama |
|-------|----------|
| **Ürün Yönetimi** | Ürün, varyant, kategori, marka, renk, beden seti yönetimi |
| **Satış Konsolu (POS)** | Hızlı barkod okuma, anlık satış, fiş yazdırma |
| **Stok Yönetimi** | Stok hareketleri, rezervasyon, transfer, düzeltme |
| **Kampanya Motoru** | X al Y öde, yüzde indirim, sabit indirim, hediye çeki |
| **Cari Hesaplar** | Müşteri/Cari takibi, borç/alacak yönetimi |
| **Kasa Yönetimi** | Açılış/kapanış, nakit/mobil ödeme mutabakatı |
| **Finansal Raporlama** | Günlük/haftalık/aylık satış raporları, KDV takibi |
| **Partner Finans** | Banka hesapları, tahsilat/ödeme işlemleri, çek/senet |
| **Etiket Basım** | Barkod etiketi, fiyat etiketi tasarımı ve yazdırma |
| **Bildirimler** | E-posta bildirimleri, push bildirimleri |
| **Entegrasyonlar** | Harici sistemlerle API entegrasyonu |

### 1.3 Hedef Kullanıcılar

- **Mağaza Sahipleri / Perakende Zincirleri**: Çok şubeli mağaza yönetimi
- **Mağaza Müdürleri**: Günlük operasyon yönetimi
- **Satış Personeli**: POS üzerinden hızlı satış
- **Kasiyerler**: Ödeme alma ve kasa yönetimi
- **Muhasebe**: Finansal raporlama ve cari takip

---

## 2. Teknoloji Stack'i

### 2.1 Backend

| Teknoloji | Versiyon | Açıklama |
|----------|---------|----------|
| **Node.js** | v20+ | JavaScript runtime |
| **NestJS** | v10 | Backend framework |
| **TypeScript** | v5 | Tip güvenli kod |
| **Prisma ORM** | v5 | Database ORM |
| **PostgreSQL** | v16 | Ana veritabanı |
| **Redis** | v7 | Cache ve Queue |
| **BullMQ** | v4 | İş kuyruğu sistemi |
| **Passport.js** | v0.7 | Authentication |
| **class-validator** | v0.14 | DTO validation |
| **Swagger** | v7 | API dokümantasyonu |
| **Winston** | v3 | Logging |
| **Sentry** | v10 | Error tracking |
| **PDFKit** | v0.18 | Belge oluşturma |
| **AWS S3 / R2** | - | Dosya depolama |

### 2.2 Frontend (Web)

| Teknoloji | Versiyon | Açıklama |
|----------|---------|----------|
| **Next.js** | v16 (App Router) | React framework |
| **React** | v19 | UI kütüphanesi |
| **TanStack Query** | v5 | Server state yönetimi |
| **Zustand** | v5 | Client state yönetimi |
| **Tailwind CSS** | v4 | CSS framework |
| **shadcn/ui** | v4 | UI bileşen kütüphanesi |
| **Axios** | v1 | HTTP client |
| **React Hook Form** | v7 | Form yönetimi |
| **Zod** | v4 | Schema validation |
| **Socket.io Client** | v4 | Real-time iletişim |

### 2.3 Mobile (React Native)

| Teknoloji | Versiyon | Açıklama |
|----------|---------|----------|
| **React Native** | v0.83 | Cross-platform mobil |
| **Expo** | v55 | Geliştirme platformu |
| **Expo Camera** | v55 | Barkod okuma |
| **Expo Secure Store** | v55 | Güvenli depolama |
| **React Navigation** | v7 | Navigation |
| **MMKV** | v4 | Hızlı key-value depolama |
| **Victory Native** | v41 | Grafikler |

### 2.4 Altyapı

| Teknoloji | Açıklama |
|----------|----------|
| **Docker** | Containerization |
| **docker-compose** | Çoklu container orkestrasyonu |
| **NGINX** | Reverse proxy (opsiyonel) |
| **Hetzner VPS** | Production hosting |
| **GitHub Actions** | CI/CD pipeline |
| **OpenTelemetry** | Distributed tracing |
| **Grafana + Prometheus** | Monitoring |

### 2.5 Monorepo Yapısı

```
shopping/                          # Proje kök dizini
├── apps/
│   ├── api/                      # NestJS Backend API
│   │   ├── src/
│   │   │   ├── modules/           # Modül bazlı organizasyon
│   │   │   │   ├── auth/          # Kimlik doğrulama
│   │   │   │   ├── product/       # Ürün yönetimi
│   │   │   │   ├── sales/         # Satış işlemleri
│   │   │   │   ├── inventory/     # Stok yönetimi
│   │   │   │   ├── campaign/      # Kampanya motoru
│   │   │   │   ├── cash-register/ # Kasa yönetimi
│   │   │   │   ├── customer/      # Müşteri yönetimi
│   │   │   │   ├── partner-finance/ # Cari hesaplar
│   │   │   │   ├── reporting/     # Raporlama
│   │   │   │   ├── receipt/       # Fiş yönetimi
│   │   │   │   └── ...
│   │   │   ├── common/            # Ortak yardımcılar
│   │   │   ├── guards/            # Auth guard'ları
│   │   │   ├── decorators/        # Özel dekoratörler
│   │   │   └── filters/           # Exception filtreleri
│   │   └── prisma/
│   │       ├── schema.prisma      # Veritabanı şeması
│   │       └── migrations/        # Migration dosyaları
│   │
│   ├── web/                       # Next.js Frontend
│   │   ├── src/
│   │   │   ├── app/               # App Router sayfaları
│   │   │   ├── components/         # React bileşenleri
│   │   │   │   ├── ui/             # shadcn/ui bileşenleri
│   │   │   │   └── shared/         # Paylaşılan bileşenler
│   │   │   ├── lib/                # Yardımcı fonksiyonlar
│   │   │   │   ├── api.ts          # API client
│   │   │   │   └── formatters.ts   # Para/tarih formatlayıcıları
│   │   │   ├── stores/             # Zustand store'ları
│   │   │   └── hooks/              # Custom React hooks
│   │   └── public/                 # Statik dosyalar
│   │
│   ├── mobile/                    # React Native (Expo)
│   │   ├── src/
│   │   │   ├── screens/           # Mobil ekranlar
│   │   │   ├── components/         # Bileşenler
│   │   │   ├── navigation/         # Navigation config
│   │   │   ├── lib/                # Yardımcılar
│   │   │   └── stores/             # Zustand store'ları
│   │   └── ...
│   │
│   └── desktop/                   # Desktop (gelecek)
│
├── packages/
│   └── shared-types/              # Paylaşılan TypeScript tipleri
│       ├── src/
│       │   └── index.ts           # Tip tanımları
│       └── dist/                  # Derlenmiş çıktı
│
├── infra/
│   ├── docker/                   # Docker dosyaları
│   │   ├── api.dev.Dockerfile
│   │   └── web.dev.Dockerfile
│   └── nginx/                    # NGINX konfigürasyonu
│
├── docs/                         # Dokümantasyon
├── scripts/                      # Yardımcı scriptler
├── docker-compose.yml            # Docker orkestrasyonu
├── package.json                  # Root package.json
├── AGENTS.md                     # Ekip agent kuralları
├── .cursorrules                  # Cursor AI kuralları
└── README.md                     # ProjeREADME
```

---

## 3. Mimari Özellikler

### 3.1 Çok Kiracılı (Multi-Tenant) Mimari

```
┌─────────────────────────────────────────────────────────────┐
│                      SOFTSHOPPING SAAS                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   TENANT A   │  │   TENANT B   │  │   TENANT C   │       │
│  │  (Mağaza 1)  │  │  (Mağaza 2)  │  │  (Mağaza 3)  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
├─────────────────────────────────────────────────────────────┤
│               SHARED INFRASTRUCTURE                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │    Redis     │  │  NestJS API  │      │
│  │  (Ortak DB)  │  │   (Cache)    │  │  (Ortak API) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

**Kiracı İzolasyonu:**
- Her veritabanı sorgusunda `tenantId` filtresi zorunlu
- Row-Level Security (RLS) veritabanı seviyesinde ek koruma
- JWT token içinde `tenantId` taşınır
- TenantGuard tüm API endpoint'lerinde çalışır

### 3.2 Güvenlik Mimarisi

```
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Rate Limiter                          │   │
│  │   Genel: 1000 req/dk | Barkod: 500 req/dk           │   │
│  │   Auth: 20 req/dk | Rapor: 10 req/dk                │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  HELMET                               │   │
│  │   Security headers, CORS, XSS protection            │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              AuthGuard ('jwt')                       │   │
│  │   JWT token doğrulama, req.user set etme             │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                TenantGuard                           │   │
│  │   tenantId filtreleme, erişim kontrolü              │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                RbacGuard                            │   │
│  │   Rol bazlı yetkilendirme                           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 RBAC (Rol Bazlı Erişim Kontrolü) Matrisi

| İşlem | Super Admin | Tenant Admin | Müdür | Kıd. Satış | Satış | Kasiyer | Muhasebe |
|-------|-------------|--------------|-------|------------|-------|---------|----------|
| Satış yap | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| İndirim ver | ✅ | ✅ | ✅ | ✅ | ⚠️limit | ❌ | ❌ |
| İade işle | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Stok düzelt | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Kasa kapat | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Rapor gör | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Maliyet gör | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Kullanıcı yönet | ✅ | ✅ | ⚠️kısıtlı | ❌ | ❌ | ❌ | ❌ |

### 3.4 Roller (UserRole Enum)

```typescript
enum UserRole {
  SUPER_ADMIN      // Sistem yöneticisi
  TENANT_ADMIN     // Kiracı yöneticisi
  STORE_MANAGER    // Mağaza müdürü
  SENIOR_SALES     // Kıdemli satış
  SALES_STAFF      // Satış elemanı
  CASHIER          // Kasiyer
  ACCOUNTANT       // Muhasebe
}
```

### 3.5 Finansal Veri Güvenliği

```
❌ PARA HESAPLAMALARINDA FLOAT KULLANILMAZ
❌ Her para alanı: Decimal(12,2) tipinde

✅ 150.00 TL → 15000 kuruş (integer cent bazlı)
✅ KDV oranları: %0, %10, %20
✅ Yuvarlama: ROUND(x, 2) ile 2 ondalık
```

---

## 4. Veritabanı Şeması

### 4.1 Temel Tablolar

| Tablo | Açıklama | Önemli Alanlar |
|-------|----------|----------------|
| `tenants` | Kiracı firma bilgileri | name, code, domain, settings |
| `users` | Kullanıcılar | email, passwordHash, role, tenantId |
| `refresh_tokens` | Refresh token'ları | token, userId, tenantId, expiresAt |
| `products` | Ana ürün bilgileri | name, sku, price, tenantId |
| `product_variants` | Ürün varyantları (beden/renk) | stockQuantity, barcode, version |
| `product_categories` | Ürün kategorileri | name, parentId |
| `product_brands` | Markalar | name |
| `product_colors` | Renkler | name, hex |
| `size_sets` | Beden setleri | name, sizes (JSON) |
| `orders` | Satış siparişleri | status, totalAmount, version |
| `order_items` | Sipariş kalemleri | quantity, unitPrice, discount |
| `payments` | Ödemeler | type, amount, method |
| `stock_movements` | Stok hareketleri | type, quantity, reason |
| `campaigns` | Kampanyalar | type, discountValue, conditions |
| `gift_vouchers` | Hediye çekleri | amount, status, source |
| `customers` | Müşteriler | name, phone, type, balance |
| `cash_registers` | Kasalar | status, balance, openedAt |
| `cash_register_movements` | Kasa hareketleri | type, amount |
| `partner_finance` | Cari işlemler | kind, amount, direction |
| `bank_accounts` | Banka hesapları | kind, bankName, accountNumber |
| `expenses` | Giderler | amount, category |
| `audit_logs` | Denetim kayıtları | action, entity, changes |
| `notifications` | Bildirimler | type, channel, sentAt |

### 4.2 Zorunlu Alan Kuralları

Her iş tablosunda bulunması gereken alanlar:

```prisma
// Her işlem tablosunda ZORUNLU
tenantId       String   @map("tenant_id") @db.Uuid
createdAt     DateTime @default(now()) @map("created_at")
updatedAt     DateTime @updatedAt @map("updated_at")
deletedAt     DateTime? @map("deleted_at")
deletedBy     String? @map("deleted_by") @db.Uuid
isDeleted     Boolean @default(false) @map("is_deleted")

// Para alanları için
price         Decimal(12,2) @map("price")

// Race condition riski olan tablolar için
version       Int @default(0)
```

### 4.3 Optimistic Locking

Stok ve sipariş güncellemelerinde eşzamanlı çakışma koruması:

```typescript
// Satış yaparken
const updated = await prisma.productVariant.update({
  where: {
    id: variantId,
    version: expectedVersion  // ← version kontrolü
  },
  data: {
    stockQuantity: { decrement: qty },
    version: { increment: 1 }
  }
});

if (updated.count === 0) {
  throw new ConflictException('Bu ürün başka bir işlem tarafından güncellendi');
}
```

---

## 5. API Mimarisi

### 5.1 Endpoint Yapısı

```
/api/v1/
├── /auth
│   ├── POST   /login
│   ├── POST   /refresh
│   ├── POST   /logout
│   └── GET    /me
│
├── /products
│   ├── GET    /                    # Liste (sayfalama)
│   ├── GET    /:id                 # Detay
│   ├── POST   /                    # Oluştur
│   ├── PUT    /:id                 # Güncelle
│   ├── DELETE /:id                 # Soft delete
│   └── POST   /barcode/lookup      # Barkod ile ürün bul
│
├── /sales
│   ├── POST   /                    # Satış oluştur
│   ├── GET    /:id                 # Satış detay
│   └── POST   /:id/return          # İade işle
│
├── /inventory
│   ├── GET    /movements           # Stok hareketleri
│   └── POST   /adjust              # Stok düzeltme
│
├── /campaigns
│   ├── GET    /                    # Liste
│   ├── POST   /                    # Oluştur
│   └── PUT    /:id/activate        # Aktifleştir
│
├── /cash-register
│   ├── POST   /open                # Kasa aç
│   ├── POST   /close               # Kasa kapat
│   └── GET    /balance             # Bakiye sorgu
│
├── /reporting
│   ├── GET    /sales               # Satış raporu
│   ├── GET    /inventory           # Stok raporu
│   └── GET    /financial           # Mali rapor
│
├── /customers
│   ├── GET    /                    # Liste
│   ├── POST   /                    # Oluştur
│   └── PUT    /:id/balance         # Bakiye güncelle
│
├── /uploads
│   └── POST   /image               # Görsel yükle
│
└── /health
    └── GET    /                    # Sağlık kontrolü
```

### 5.2 Guard Zinciri

```typescript
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
@ApiBearerAuth()
```

### 5.3 DTO Validation

```typescript
export class CreateProductDto {
  @ApiProperty({ example: 'Polo Tişört' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: '29.99' })
  @IsDecimal({ decimal_digits: '0,2' })
  price: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
```

---

## 6. Rol Bazlı Agent Ekip Yapısı

### 6.1 Ekip Üyeleri ve Sorumluluklar

| # | İsim | Rol | Birincil Alan |
|---|------|-----|---------------|
| 1 | **Defne** | Product Owner / Domain Analyst | İş akışı, kabul kriterleri |
| 2 | **Atlas** | Tech Lead / Architect | Mimari, kapsam, risk |
| 3 | **Bora** | Backend API Engineer | NestJS, REST, Guards |
| 4 | **Mira** | Prisma / Database Engineer | Schema, migration, index |
| 5 | **Ece** | Frontend Engineer | Next.js, TanStack Query |
| 6 | **Yusuf** | Mobile Engineer | React Native, Expo |
| 7 | **Kaan** | Security & Tenant Auditor | Tenant izolasyonu, RBAC |
| 8 | **Deniz** | Financial Engineer | Para, stok, algoritmalar |
| 9 | **Selin** | QA / Test Engineer | Test, edge case |
| 10 | **Emir** | DevOps / Release Steward | Docker, CI/CD |

### 6.2 Karar Akışı

```
Talep Geldi
    │
    ▼
[Defne] → İş hedefi + Kabul kriterleri + Domain etkisi
    │
    ▼
[Atlas] → Mimari sınır + Kapsam + Risk analizi
    │
    ├──► [Mira]  → DB/schema/migration planı
    ├──► [Bora]  → API/service/DTO/guard
    ├──► [Ece]   → Web ekranı/form/state
    ├──► [Yusuf] → Mobil ekran
    └──► [Deniz] → Finansal algoritmalar
    │
    ▼
[Kaan] → Güvenlik denetimi (HER ZAMAN)
    │
    ▼
[Selin] → Test planı + Doğrulama
    │
    ▼
[Emir] → Build + Release notu
```

### 6.3 Agent Rol Detayları

#### Defne — Product Owner

```
Sorumluluk: Kullanıcı niyetini somut iş akışına çevirir

Çıktı:
- İş Hedefi
- Kullanıcı Hikayesi
- Kabul Kriterleri (checkbox)
- Etkilenen Modüller
- Açık Sorular
```

#### Atlas — Tech Lead

```
Sorumluluk: Mimari sınırları korur, gereksiz abstraction önler

Karar Kuralları:
- Önce dosya ve pattern'leri oku, sonra karar ver
- Yeni endpoint = DTO + service + controller + test birlikte
- DB değişikliği = additive-first protokol
- Breaking change = shared-types güncellenmeli
```

#### Bora — Backend API Engineer

```
Sorumluluk: NestJS controller/service/DTO düzeni

Checklist:
✅ Controller route /api/v1 prefix ile uyumlu
✅ Her endpoint'te AuthGuard + TenantGuard
✅ Mutasyon endpoint'lerinde DTO zorunlu
✅ class-validator ile input sınırları
✅ Prisma sorgularında tenantId filtresi
✅ Çoklu tablo $transaction içinde
✅ Para hesapları Decimal (Float yok)
✅ Hata mesajları kullanıcı dostu
✅ Swagger decorator'ları tam
```

#### Mira — Prisma / Database Engineer

```
Sorumluluk: Schema tasarımı, migration güvenliği

Zorunlu Alanlar:
✅ Her iş tablosunda tenantId + index
✅ Soft delete: deletedAt, deletedBy, isDeleted
✅ Para alanları: Decimal (Float yasak)
✅ Race-condition: version kolonu
✅ Timestamp: createdAt, updatedAt
```

#### Ece — Frontend Engineer

```
Sorumluluk: Next.js App Router ekranları

Checklist:
✅ API çağrıları api.ts üzerinden
✅ Para formatı formatCurrency() ile
✅ Loading/empty/error/success durumları
✅ "use client" sadece gerektiğinde
✅ Formlar: react-hook-form + zod
✅ Mobil responsive (Tailwind)
```

#### Yusuf — Mobile Engineer

```
Sorumluluk: iOS ve Android ekranları

Checklist:
✅ Token MMKV'de saklanıyor
✅ Barkod < 50ms hedef
✅ Bluetooth yazıcı (Star/Epson)
✅ Offline senaryo handle edilmiş
✅ Platform farkları (iOS/Android)
```

#### Kaan — Security Auditor

```
Sorumluluk: Tenant izolasyonu, RBAC, audit

Zorunlu Kontroller:
✅ Tüm Prisma sorgularında tenantId
✅ Public olmayanlarda AuthGuard
✅ JWT tenantId = request tenantId
✅ Rol kontrolü iş gereksinimine uygun
✅ Audit log kayıtları
✅ Upload: MIME + boyut kontrolü
```

#### Deniz — Financial Engineer

```
Sorumluluk: Para, stok, kampanya algoritmaları

Kurallar:
✅ Tüm para Decimal(12,2)
✅ Hesaplama integer cent bazlı
✅ KDV: %0 / %10 / %20
✅ Yuvarlama ROUND(x, 2)
✅ Kampanya dağıtımı oransal
✅ Satış transaction atomik
```

#### Selin — QA / Test Engineer

```
Sorumluluk: Test planı, regresyon

Test Matrisi:
| API logic | Jest unit + spec |
| Tenant izolasyonu | E2E negatif test |
| DB değişikliği | prisma validate |
| Finansal algoritma | Unit test |
```

#### Emir — DevOps / Release Steward

```
Sorumluluk: Build, Docker, CI/CD

Docker Sözleşmesi (§2.5):
✅ postgres/redis host ports yok
✅ Tek servisler: api + web
✅ npm run docker:dev/fresh/db/down
✅ Health check: /api/v1/health
```

### 6.4 Simüle Ekip Kullanım Protokolü

Her talep için sırayla:

```
1. Defne → İş hedefi + Kabul kriterleri
2. Atlas → Kapsam + Risk analizi
3. Mira/Bora/Ece/Yusuf/Deniz → İmplementasyon
4. Kaan → Güvenlik denetimi
5. Selin → Test planı
6. Emir → Release notu
```

---

## 7. Geliştirme Ortamı

### 7.1 Docker Geliştirme

```bash
# Tam stack başlat
npm run docker:dev

# Temiz kurulum
npm run docker:fresh

# Sadece DB + Cache
npm run docker:db

# Durdur
npm run docker:down

# Sağlık kontrolü
npm run check:api
```

### 7.2 Yerel Geliştirme

```bash
# Tüm servisler
npm run dev:all

# Sadece API
npm run dev:api

# Sadece Web
npm run dev:web

# Build
npm run build:api
npm run build:web

# Test
npm run test

# Database
npm run db:migrate
npm run db:seed
```

### 7.3 Port Yapılandırması

| Servis | Varsayılan Port | Açıklama |
|--------|----------------|----------|
| **Web (Frontend)** | 3000 | Next.js UI |
| **API (Backend)** | 4000 → 4002 (host) | NestJS API |
| **PostgreSQL** | 5432 (iç ağ) | DB |
| **Redis** | 6379 (iç ağ) | Cache |

---

## 8. Kritik Metrikler

| Metrik | Hedef |
|--------|-------|
| Barkod okuma yanıt süresi | < 50ms |
| API p95 latency | < 200ms |
| DB sorgu süresi | < 100ms |
| E2E test coverage | %100 |
| Unit test coverage | %80+ |
| JWT access token | 15 dakika |
| Refresh token | 30 gün |
| Brute force kilit | 5 başarısız → 15 dk |

---

## 9. Proje Durumu

### 9.1 Tamamlanan Modüller

- [x] Auth modülü (login, refresh, logout)
- [x] Tenant izolasyonu
- [x] RBAC sistemi
- [x] Ürün yönetimi (CRUD + barkod)
- [x] Varyant yönetimi
- [x] Kategori/Marka/Renk yönetimi
- [x] Satış konsolu (POS)
- [x] Kampanya motoru
- [x] Fiş yazdırma
- [x] Kasa yönetimi
- [x] Stok hareketleri
- [x] Müşteri yönetimi
- [x] Cari hesaplar
- [x] Partner finans
- [x] Banka hesapları
- [x] Raporlama
- [x] Gider yönetimi
- [x] Bildirim sistemi
- [x] Label template + yazdırma
- [x] Upload sistemi

### 9.2 Geliştirme Aşamasında

- [ ] E2E test coverage
- [ ] Performans optimizasyonu
- [ ] Mobil uygulama (tam özellik)
- [ ] Desktop uygulama

---

## 10. Dokümantasyon Yapısı

```
docs/
├── SOFTSHOPPING_Genel_Sistem_Raporu.md
├── SoftShopping_Mevcut_Mimari_Raporu_v1.md
├── MAKBUZ_YAZDIRMA_OLUSTURMA_DOKUMANI.md
├── FRONTEND_GAP_RAPORU.md
└── DR_RUNBOOK.md
```

---

## 11. Önemli Kurallar (Kırmızı Çizgiler)

```
❌ Tenant filtresi olmadan Prisma sorgusu yazma
❌ Para alanlarında float veya hassasiyetsiz toplam
❌ Satış/ödeme/stok/kasa işlemlerini transaction dışında bırakma
❌ DTO'suz mutasyon endpoint'i ekleme
❌ Rol gerektiren endpoint'i RBAC'siz bırakma
❌ .env, credential veya gerçek müşteri verisini commit etme
❌ Next.js repo pattern'ini okumadan eski bilgiyle kod yazma
❌ Migration geçmişini anlamadan reset veya destructive işlem
❌ Soft delete yerine hard delete kullanma
❌ Stack trace içeren hata mesajı döndürme
❌ Upload'da MIME ve boyut kontrolü yapmama
```

---

## 12. İletişim ve Destek

- **Proje Yöneticisi:** Simüle Edilmiş AI Ekip
- **Dokümantasyon:** AGENTS.md (versiyon 2.0)
- **Kurallar:** .cursorrules

---

**Rapor Hazırlayan:** SoftShopping AI Ekip
**Son Güncelleme:** 8 Mayıs 2026
