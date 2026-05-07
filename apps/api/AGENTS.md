# SoftShopping API — Backend Agent Kuralları

> Bu dosya `AGENTS.md` ana dökümanının backend katmanına özel ek kurallarını içerir.
> Cursor bu klasörde çalışırken bu kuralları otomatik yükler.

## Bu Klasörde Çalışırken

Bora (Backend) ve Mira (Prisma) rolleri birincil aktiftir.
Her değişiklikte Kaan (Security) kontrolü zorunludur.

---

## NestJS Modül Yapısı

```
src/modules/[module-name]/
  [module-name].module.ts
  [module-name].controller.ts       ← Route tanımları, guard'lar, Swagger
  [module-name].service.ts          ← Business logic
  dto/
    create-[module-name].dto.ts
    update-[module-name].dto.ts
    [module-name]-filter.dto.ts     ← Listeleme/filtreleme için
  entities/
    [module-name].entity.ts         ← Response tipi (Prisma model değil)
  [module-name].service.spec.ts     ← Unit testler
```

---

## Guard Zinciri — ZORUNLU

Her korumalı endpoint şu sırayla guard kullanır:

```typescript
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@Roles([UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER])
@ApiBearerAuth()
```

- `AuthGuard('jwt')` → JWT doğrulama, `req.user` set eder
- `TenantGuard` → `req.user.tenantId` ile tablo erişimi filtreler
- `RbacGuard` → `@Roles()` dekoratöründeki rolleri kontrol eder

Public endpoint için: `@Public()` dekoratörü kullan

---

## Prisma Sorgu Kuralları

### Tenant filtresi — ZORUNLU
```typescript
// ✅ DOĞRU
const products = await this.prisma.product.findMany({
  where: {
    tenantId: tenantId,  // Her zaman zorunlu
    isDeleted: false,     // Her zaman zorunlu
    // ... diğer filtreler
  },
});

// ❌ YANLIŞ — tenant filtresi yok
const products = await this.prisma.product.findMany();
```

### Transaction — Çoklu tablo yazımında ZORUNLU
```typescript
// ✅ DOĞRU
const result = await this.prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData });
  await tx.productVariant.update({
    where: { id: variantId, version: expectedVersion },
    data: { stockQuantity: { decrement: qty }, version: { increment: 1 } },
  });
  await tx.stockMovement.create({ data: movementData });
  await tx.payment.create({ data: paymentData });
  return order;
});

// ❌ YANLIŞ — transaction dışı çoklu yazım
await this.prisma.order.create({ data: orderData });
await this.prisma.productVariant.update(...); // Kritik hata riski
```

### Soft delete — Her sorguda
```typescript
// findMany, findFirst, findUnique where clause'una ekle
where: {
  tenantId,
  isDeleted: false,  // Prisma middleware yoksa elle ekle
}
```

---

## Sayfalama ve `@Query` parametreleri — Bora (zorunlu)

HTTP sorgu parametreleri varsayılan olarak **string** gelir (`?limit=100` → `"100"`). `@Query('page') page?: number` ile işaretlense bile **otomatik sayıya dönüşüm garanti değildir**; tip ile çalışma zamanı davranışı uyumsuz kalabilir.

### Yapılmaması gerekenler

```typescript
// ❌ YANLIŞ — skip NaN olabilir, Prisma 500 döner
const page = options.page ?? 1;
const limit = Math.min(options.limit ?? 20, 100);
const skip = (page - 1) * limit;
await prisma.model.findMany({ skip, take: limit, ... });
```

### Yapılması gerekenler (tercih sırası)

1. **Ortak yardımcı:** `src/common/utils/pagination.ts` → `normalizePagination({ page, limit }, { defaultLimit, maxLimit })` ile `{ page, limit, skip }` üret; `skip` her zaman geçerli tamsayı olsun.
2. **Controller katmanı:** `@Query('page', new ParseIntPipe({ optional: true }))` veya liste için ayrı bir **query DTO** + `@Type(() => Number)` (`class-transformer`) + global `ValidationPipe`.
3. **Test:** `GET ...?limit=100` (sayfa yok), `?page=1&limit=100`, geçersiz `page` için **200 ve tutarlı meta**, Prisma hatası **olmamalı**.

### Prisma ile ilişki

`take` kullanılıp `skip` geçersiz/eksik bırakılırsa istemci **“Argument `skip` is missing”** üretebilir. Liste servislerinde `skip` ve `take` **birlikte** ve **sayısal olarak doğrulanmış** olmalıdır.

---

## DTO Kuralları

```typescript
import { IsString, IsUUID, IsOptional, IsDecimal, Min, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Polo Tişört', description: 'Ürün adı' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: '29.99', description: 'Satış fiyatı (TL)' })
  @IsDecimal({ decimal_digits: '0,2' })
  price: string; // Decimal string olarak gelir

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
```

---

## Hata Yönetimi

```typescript
// ✅ DOĞRU — kullanıcı dostu, güvenli
throw new NotFoundException('Ürün bulunamadı');
throw new BadRequestException('Stok yetersiz');
throw new ForbiddenException('Bu işlem için yetkiniz bulunmuyor');
throw new ConflictException('Bu barkod zaten kayıtlı');

// ❌ YANLIŞ — gizli veri veya stack trace içerebilir
throw new Error(err.stack);
return { error: err.message, query: sqlQuery }; // SQL açığa çıkıyor
```

---

## Swagger Dekoratörleri

Her controller metodunda:
```typescript
@ApiOperation({ summary: 'Ürün listesi getir' })
@ApiResponse({ status: 200, description: 'Başarılı', type: [ProductEntity] })
@ApiResponse({ status: 401, description: 'Yetkisiz erişim' })
@ApiResponse({ status: 403, description: 'Yetersiz yetki' })
@ApiQuery({ name: 'page', required: false, type: Number })
```

---

## BullMQ İş Tanımı

```typescript
// Producer (service içinde)
await this.reportQueue.add('generate-report', {
  tenantId,
  reportType,
  dateRange,
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
});

// Processor (ayrı dosya: report.processor.ts)
@Processor('reports')
export class ReportProcessor {
  @Process('generate-report')
  async handleReport(job: Job<ReportJobData>) {
    // ...
  }
}
```

---

## Build Doğrulaması

Bu klasörde her değişiklik sonrası:

```bash
cd apps/api
npx prisma validate
npx prisma generate
npm run build --workspace=apps/api
npm run lint --workspace=apps/api
npm test --workspace=apps/api
```
