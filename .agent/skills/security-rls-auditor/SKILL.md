---
name: security-rls-auditor
description: SoftShopping güvenlik denetçisi — tenant izolasyonu, RLS politikaları ve audit log zorunlulukları
---

# Security & RLS Auditor — SoftShopping

## Amaç
Her kod üretiminden önce güvenlik kontrollerini denetler. "Hiçbir veri tenant filtresi olmadan erişilemez" kuralını garanti eder.

## Güvenlik Check-list (Her Kod Üretiminde)

### 🔒 Tier 1: Tenant İzolasyonu (ZORUNLU)
- [ ] Her Prisma sorgusu `tenantId` içeriyor mu?
- [ ] Her `findMany` / `findFirst` / `count` sorgusunda `tenantId` where clause'da mı?
- [ ] `create` sorgularında `tenantId` data'ya ekleniyor mu?
- [ ] `update` / `delete` sorgularında `tenantId` where'de doğrulanıyor mu?
- [ ] Controller'dan `@TenantId()` decorator ile alınıyor mu?

### 🔒 Tier 2: Soft Delete
- [ ] `findMany` sorgularında `deletedAt: null` filtresi var mı?
- [ ] Silme işlemi `update({ deletedAt: new Date() })` ile mi yapılıyor?
- [ ] Hard delete ASLA kullanılmıyor mu?

### 🔒 Tier 3: Audit Log
- [ ] Mutasyon işlemlerinde (CREATE/UPDATE/DELETE) `AuditLog` kaydı oluşturuluyor mu?
- [ ] `oldValue` ve `newValue` JSON olarak kaydediliyor mu?
- [ ] `userId` ve `tenantId` her log'da mevcut mu?

### 🔒 Tier 4: Frontend Güvenlik
- [ ] API çağrılarında `x-tenant-id` header ekleniyor mu?
- [ ] JWT token HttpOnly cookie'de mi saklanıyor?
- [ ] Role-based UI kontrolü yapılıyor mu?

### 🔒 Tier 5: API Güvenlik
- [ ] Controller'da `@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)` var mı?
- [ ] `@Roles()` decorator ile yetki kontrolü var mı?
- [ ] DTO'larda `class-validator` decorator'ları var mı?
- [ ] Şifre alanları response'dan hariç tutuluyor mu?

## RLS Politika Kontrol

```sql
-- Her tablo için kontrol et:
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'hedef_tablo';
```

Beklenen: Her tablo için 4 politika (SELECT, INSERT, UPDATE, DELETE) olmalı.

## Yasaklar (HARD CONSTRAINTS)
1. ❌ `tenantId` filtresi olmadan sorgu ASLA yazılmaz
2. ❌ `localStorage` ile auth bilgisi ASLA saklanmaz (Server Components cookie gerektirir)
3. ❌ Raw SQL sorgusu tenant filtresi olmadan ASLA çalıştırılmaz
4. ❌ Controller'da iş mantığı ASLA olmaz (Service'e taşı)
5. ❌ Hata mesajında veritabanı detayı ASLA döndürülmez
