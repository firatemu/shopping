# TextilePOS — Cursor Prompt Şablonları
**Hazır Prompt Kütüphanesi | Kopyala-Yapıştır Kullanım**

> Bu dosyadan kopyalayıp Cursor chat'e yapıştır.
> `[BÜYÜK HARF]` ile işaretli yerleri doldurup gönder.

---

## 🚀 P1 — Yeni Özellik (Tam Stack)

```
TextilePOS ekibi olarak aşağıdaki özelliği eksiksiz implemente et:

ÖZELLIK: [ÖZELLIK AÇIKLAMASI]

Çalışma protokolü — sırayla uygula:

1. [Defne] İş hedefi, kullanıcı hikayesi ve kabul kriterleri.
2. [Atlas] Etkilenen katmanlar, dosyalar, mimari karar, riskler.
3. [Mira] DB/schema değişikliği ve migration planı (gerekiyorsa).
4. [Bora] API endpoint'leri, service, DTO, guard, Swagger.
5. [Ece] Web ekranları, TanStack Query, Zustand, 4 UI state.
6. [Yusuf] Mobil ekranlar (gerekiyorsa).
7. [Deniz] Finansal/stok algoritma doğrulaması (gerekiyorsa).
8. [Kaan] Güvenlik denetimi — tenant izolasyonu, RBAC, audit.
9. [Selin] Test planı, edge case'ler, build komutları.
10. [Emir] Build çalıştır, release notu, Final Handoff.

Kurallar:
- Önce ilgili dosyaları oku, varsayım yapma.
- Küçük adımlarla ilerle, her adımı doğrula.
- Tenant filtresi, DTO, transaction, RBAC — hiç atlama.
- Final Handoff formatında bitir.
```

---

## 🐛 P2 — Bug Fix

```
TextilePOS'ta aşağıdaki bug'ı çöz:

BELİRTİ: [NE OLUYOR]
REPRO: [NASIL TETİKLENİYOR]
BEKLENEN: [NE OLMALI]
GERÇEKLEŞEN: [NE OLUYOR]
ORTAM: [dev / staging / prod]

Protokol:
1. [Selin] İlgili kodu oku, root cause bul, kanıtı dosya:satır ile göster.
2. [Kaan] Güvenlik etkisi var mı? Tenant veya RBAC açığı mı?
3. Fix'i implement et — mevcut pattern'e uy.
4. Regresyon testi ekle.
5. [Emir] Build çalıştır, release notu yaz.

Bug Triage formatında bitir.
```

---

## 🔒 P3 — Güvenlik Denetimi

```
[Kaan] TextilePOS güvenlik denetimi:

KAPSAM: [DOSYA/ENDPOINT/MODÜL YOLU]

Kontrol et ve her madde için ✅ / ⚠️ / ❌ ile işaretle:

□ Tenant izolasyonu — her Prisma sorgusunda tenantId var mı?
□ isDeleted filtresi — soft delete sorguları filtered mı?
□ Guard zinciri — AuthGuard + TenantGuard + RbacGuard tam mı?
□ RBAC doğruluğu — rol iş gereksinimine uygun, fazla yetki yok
□ JWT payload → tenantId uyumu doğru mu?
□ Audit log — mutasyonlar (satış/iade/stok/kasa) kaydediliyor mu?
□ Hata mesajları — stack trace veya gizli veri içermiyor mu?
□ Upload güvenliği — MIME, boyut, dosya yolu (varsa)
□ Cross-tenant test — başka tenant verisi erişilebilir mi?
□ Brute force koruması — etkilenen endpoint'lerde aktif mi?

Bulunan sorunlar için düzeltme öner ve uygula.
```

---

## 💰 P4 — Finansal Algoritma Review

```
[Deniz] TextilePOS finansal akış denetimi:

KAPSAM: [DOSYA YOLU veya AKIŞ AÇIKLAMASI]

Kontrol et:
□ Para tipleri — Decimal mi? Float kullanımı var mı?
□ Transaction atomikliği — çoklu tablo yazımı $transaction içinde mi?
□ Kampanya dağıtımı — kalem ağırlığına göre oransal mı?
□ KDV hesabı — doğru orana göre mi? (%0/%10/%20)
□ Yuvarlama — ROUND(x,2) ile 2 ondalık mı?
□ Stok hareketi — doğru event'e bağlı mı? (reserved vs sold)
□ İade/iptal senaryoları — stok geri dönüşü atomik mi?
□ Eş zamanlı işlem — optimistic locking (version) var mı?
□ Rapor toplamları — DB aggregation mı, uygulama hesabı mı?
□ Kasa kapanışı — geri alınamaz ve atomik mi?

Sorun bulunursa düzelt, test yaz.
```

---

## 🗃️ P5 — Migration (DB Değişikliği)

```
[Mira] TextilePOS Prisma migration:

DEĞİŞİKLİK: [SCHEMA DEĞİŞİKLİĞİ AÇIKLAMASI]

Protokol — sırayla yap:
1. Mevcut migration geçmişini oku (prisma/migrations/).
2. Additive-first plan: nullable veya @default ile başla.
3. Backfill gerekiyorsa — deterministic SQL yaz.
4. Constraint / NOT NULL — son adımda ekle.
5. Seed uyumluluğunu kontrol et.
6. tenantId, isDeleted, Decimal, version kurallarına uy.

Doğrulama (bu komutları sırayla çalıştır):
  cd apps/api
  npx prisma validate
  npx prisma generate
  npm run build --workspace=apps/api

Migration planını yaz, uygula, sonucu göster.
```

---

## 🖥️ P6 — Sadece Frontend

```
[Ece] TextilePOS web ekranı:

EKRAN: [EKRAN ADI / ROUTE]
AMAÇ: [NE YAPACAK]
API: [KULLANILACAK ENDPOINT'LER]

Kurallar:
- API çağrıları apps/web/src/lib/api.ts üzerinden.
- TanStack Query ile server state yönetimi.
- 4 durum zorunlu: loading skeleton | empty state | error state | success.
- Para → formatCurrency(), tarih → formatDate().
- Form: react-hook-form + zod validation.
- Responsive (mobile-first, Tailwind).
- shadcn/ui bileşenlerini önce değerlendir.
- 'use client' sadece gerektiğinde, minimum scope.
- [Kaan] RBAC: yetkisiz kullanıcı ne görür? Handle et.

Build: npm run build --workspace=apps/web
```

---

## 📱 P7 — Sadece Mobile

```
[Yusuf] TextilePOS mobil ekranı:

EKRAN: [EKRAN ADI]
PLATFORM: [iOS / Android / Her ikisi]
ÖZELLIK: [NE YAPACAK]

Kurallar:
- Token: MMKV (AsyncStorage yasak).
- Barkod: Expo Camera / Vision Camera — hedef < 50ms.
- BLE Yazıcı: Star Micronics / Epson TM serisi.
- 4 durum: loading | empty | error | success.
- Platform farkları (iOS permission, Android back) handle et.
- OTA update uyumluluğunu korumak için native değişiklik yapma (zorunlu değilse).
- [Kaan] offline'da hassas veri nasıl saklanıyor? Güvenli mi?

Build: cd apps/mobile && npx expo-doctor && npx tsc --noEmit
```

---

## 🔌 P8 — Yeni API Endpoint

```
[Bora] TextilePOS yeni API endpoint:

ENDPOINT: [METHOD] /api/v1/[PATH]
AMAÇ: [NE YAPACAK]
YETKİ: [HANGİ ROLLER ERİŞEBİLİR]

Implement et:
1. DTO (create/update/filter) — class-validator ile tam validation.
2. Service metodu — Prisma + tenantId + isDeleted filtresi.
3. Controller — guard zinciri + Swagger decorator'ları.
4. Error handling — kullanıcı dostu, güvenli mesajlar.
5. Unit test — service.spec.ts.

[Kaan] Guard zinciri ve tenant izolasyonunu denetle.
[Selin] Test senaryoları ve build doğrula.

Build: npm run build --workspace=apps/api && npm test --workspace=apps/api
```

---

## ⚡ P9 — Performance İyileştirme

```
[Selin + Atlas] TextilePOS performance analizi:

SORUN: [YAVAŞ ENDPOINT/QUERY/EKRAN]
SEMPTOM: [NE KADAR YAVAŞ, NASIL TETİKLENİYOR]

Analiz et:
□ DB index kullanımı — EXPLAIN ANALYZE çalıştır
□ N+1 sorgu var mı? → Prisma include/select optimize et
□ Cache eklenebilir mi? → TTL ve invalidation stratejisi belirt
□ BullMQ'ya taşınabilir mi? → async işlem yapılabilir mi?
□ Rate limit etkisi var mı?
□ Frontend'de gereksiz re-render var mı?
□ TanStack Query staleTime/cacheTime optimize mi?

Hedef metrikler: API p95 < 200ms | Barkod < 50ms | DB sorgu < 100ms

Öneri yaz, uygula, önce/sonra karşılaştır.
```

---

## 📦 P10 — Release Hazırlık

```
[Emir + Selin] TextilePOS release hazırlık kontrolü:

Şu anki çalışmayı değerlendir ve her madde için ✅ / ❌ / ⚠️ işaretle:

BUILD:
□ npm run build --workspace=apps/api  → ?
□ npm run build --workspace=apps/web  → ?
□ npx expo-doctor (mobile değiştiyse)  → ?

TEST:
□ npm test --workspace=apps/api  → ?
□ Kritik akışlar (satış, iade, kasa) test edildi mi?
□ Tenant izolasyonu negatif testi yapıldı mı?

DB:
□ Migration gerekli mi? Komut: ...
□ Seed idempotent mi?
□ Additive mi, breaking var mı?

GÜVENLIK:
□ .env veya credential commit edilmedi
□ Yeni env değişkeni var mı? Docker/CI güncellendi mi?

DOCKER:
□ docker compose ps → tüm servisler healthy
□ GET /health → 200 OK

Final Handoff formatında rapor yaz.
```

---

## 📋 P11 — Kod Review

```
TextilePOS ekibi olarak aşağıdaki kodu review et:

DOSYA(LAR): [DOSYA YOLU]

Her rol kendi alanını incelesin:

[Bora] Backend kalitesi:
- Guard/role yapısı doğru mu?
- DTO validation yeterli mi?
- Prisma sorguları tenantId ve soft delete kurallarına uyuyor mu?
- Transaction veya audit log eksik mi?

[Mira] DB kalitesi:
- Index eksik mi?
- Decimal/soft delete kuralları var mı?
- N+1 sorgu riski?

[Ece/Yusuf] Frontend kalitesi:
- api.ts kullanılıyor mu?
- 4 UI state var mı?
- formatCurrency/formatDate kullanılıyor mu?

[Kaan] Güvenlik:
- Tenant izolasyonu tam mı?
- RBAC doğru mu?
- Hata mesajları güvenli mi?

[Deniz] Finansal (gerekiyorsa):
- Para tipleri doğru mu?
- Transaction atomik mi?

Bulunan sorunları öncelik sırasına göre listele (🔴 kritik / 🟡 önemli / 🟢 öneri).
Varsa düzelt.
```

---

## 🔄 P12 — Refactor

```
[Atlas] TextilePOS refactor:

HEDEF: [REFACTOR EDİLECEK KOD/MODÜL]
GEREKÇE: [NEDEN REFACTOR GEREKİYOR]

Protokol:
1. Mevcut davranışı belgele (testler yoksa önce test yaz).
2. Refactor planı çıkar — küçük adımlar.
3. Her adımda build/test çalıştır.
4. Before/after davranış karşılaştırması yap.
5. [Kaan] Refactor güvenlik açığı yaratmadı mı?
6. [Selin] Regresyon testi çalıştır.

Önemli: Kullanıcının mevcut çalışmasını geri alma.
Önemli: Kapsam creep'i önle — sadece belirlenen alanı refactor et.
```
