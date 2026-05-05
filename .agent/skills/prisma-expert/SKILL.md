---
name: prisma-expert
description: TextilePOS Prisma ORM uzmanı — tenant_id bazlı güvenli sorgular, şema yönetimi ve migration stratejileri
---

# Prisma Expert — TextilePOS

## Amaç
Tüm Prisma sorgularının multi-tenant güvenlik kurallarına uygun olmasını sağlar. Her sorgu `tenantId` filtresi ve `deletedAt: null` kontrolü içermelidir.

## Zorunlu Kurallar

### 1. Sorgu Güvenliği
Her Prisma sorgusu şu yapıda olmalıdır:

```typescript
// ✅ DOĞRU
await this.prisma.product.findMany({
  where: {
    tenantId,
    deletedAt: null,
    // ...diğer filtreler
  },
});

// ❌ YANLIŞ — tenantId eksik
await this.prisma.product.findMany({
  where: { name: 'test' },
});
```

### 2. Şema Standartları
Her yeni Prisma model şunları içermelidir:

```prisma
model YeniModel {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  // ...diğer alanlar
  version   Int      @default(1)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
  createdBy String?  @map("created_by") @db.Uuid
  updatedBy String?  @map("updated_by") @db.Uuid

  @@index([tenantId])
  @@map("yeni_modeller")
}
```

### 3. Transaction Kuralları
Birden fazla tabloyu etkileyen işlemler `$transaction` içinde olmalıdır:

```typescript
await this.prisma.executeTransaction(async (tx) => {
  const order = await tx.order.create({ data: { ... } });
  await tx.stockMovement.create({ data: { ... } });
  await tx.payment.create({ data: { ... } });
  return order;
});
```

### 4. Optimistic Locking
`product_variants` ve `orders` tablolarında `version` kontrolü zorunludur:

```typescript
const updated = await tx.productVariant.updateMany({
  where: { id: variantId, version: currentVersion },
  data: { stockQuantity: newQty, version: { increment: 1 } },
});
if (updated.count === 0) throw new ConflictException('Optimistic lock — veri başka biri tarafından değiştirildi');
```

### 5. Migration Stratejisi
- Her migration `prisma migrate dev --name descriptive_name` ile oluşturulmalı
- Production'da `prisma migrate deploy` kullanılmalı
- Breaking change: her zaman 2 adımlı migration (eski alan koru → veri taşı → eski alanı sil)

## Kullanım Alanları
| Modül | Kullanım |
|-------|----------|
| Ürün & Varyasyon | Barkod sorgusu, stok güncelleme, optimistic lock |
| Satış | Atomik checkout transaction, sipariş numarası üretimi |
| Cari Hesap | Bakiye güncelleme, ledger hareketi |
| Kasa | Oturum açma/kapama transaction |
| Raporlama | Aggregate sorgular, date range filtresi |
