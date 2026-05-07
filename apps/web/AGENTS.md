# SoftShopping Web — Frontend Agent Kuralları

> Bu dosya `AGENTS.md` ana dökümanının Next.js web katmanına özel ek kurallarını içerir.
> Cursor bu klasörde çalışırken bu kuralları otomatik yükler.

## Bu Klasörde Çalışırken

Ece (Frontend) rolü birincil aktiftir.
Kaan (Security) RBAC ve auth kontrolü yapar.
Atlas (Tech Lead) Server/Client component sınırlarını denetler.

---

## Yerel geliştirme — Web portu (kilitli)

- Varsayılan adres: **`http://localhost:3000`** (kök `.env` / `WEB_PORT` ve `docker-compose.yml` ile aynı sözleşme).
- **`npm run dev` (workspace `apps/web`) asla sessizce 3001/3002’ye kaydırılmamalı.** Script `next dev -p 3000` ile sabitlenir; port meşgulse süreç **hata verir** — çakışanı kapat veya `scripts/clean-dev-ports.sh` kullan.
- Cursor / AI asistanı kullanıcıya “3001’den aç” dememeli; port sapması **Emir (DevOps)** + **Atlas (mimari tutarlılık)** ihlali sayılır.

---

## ⚠️ KRİTİK UYARI

Next.js sürümü ve App Router pattern'leri eğitim verilerinden farklı olabilir.
**Kod yazmadan önce `apps/web/src` klasör yapısını oku.**
Mevcut pattern'e uy, tahmin etme.

---

## Klasör Yapısı

```
src/
  app/                          ← Next.js App Router
    (auth)/                     ← Auth group (login, register)
    (dashboard)/                ← Dashboard group (korumalı)
      layout.tsx                ← Auth kontrolü burada
      page.tsx
    [her modül]/
      page.tsx                  ← Server Component (default)
      [feature]/
        page.tsx
  components/
    ui/                         ← shadcn/ui bileşenleri (elleme)
    [feature]/                  ← Feature-specific bileşenler
    shared/                     ← Paylaşılan bileşenler
  lib/
    api.ts                      ← ← ← TÜM API ÇAĞRILARI BURADAN
    formatters.ts               ← formatCurrency, formatDate
    utils.ts
  stores/                       ← Zustand store'ları
    auth.store.ts
    pos.store.ts                ← Satış konsolu state
  hooks/                        ← Custom React hooks
  types/                        ← Frontend tip tanımları
```

---

## API Çağrıları — SADECE api.ts Üzerinden

```typescript
// ✅ DOĞRU — api.ts üzerinden
import { api } from '@/lib/api';

const { data, isLoading, error } = useQuery({
  queryKey: ['products', tenantId, filters],
  queryFn: () => api.get('/products', { params: filters }),
});

// ❌ YANLIŞ — direkt axios/fetch
import axios from 'axios';
const response = await axios.get('http://localhost:3000/api/v1/products');
```

---

## TanStack Query Kuralları

```typescript
// Query — veri okuma
const { data, isLoading, isError, error } = useQuery({
  queryKey: ['products', { page, search, categoryId }],
  queryFn: () => api.getProducts({ page, search, categoryId }),
  staleTime: 1000 * 60 * 5,  // 5 dakika
});

// Mutation — veri yazma
const { mutate, isPending } = useMutation({
  mutationFn: api.createProduct,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    toast.success('Ürün oluşturuldu');
  },
  onError: (error) => {
    toast.error(error.response?.data?.message ?? 'Bir hata oluştu');
  },
});
```

---

## Zorunlu UI State'leri

Her veri ekranında bu 4 durum mutlaka implement edilmeli:

```tsx
// ✅ DOĞRU — 4 durum tam
function ProductList() {
  const { data, isLoading, isError, error } = useQuery(...)

  if (isLoading) return <ProductListSkeleton />  // Loading skeleton
  
  if (isError) return (
    <ErrorState 
      message={error.response?.data?.message ?? 'Ürünler yüklenemedi'} 
      onRetry={() => refetch()}
    />
  )
  
  if (!data?.items.length) return (
    <EmptyState 
      title="Henüz ürün yok" 
      description="İlk ürününüzü ekleyin"
      action={<Button onClick={() => router.push('/products/new')}>Ürün Ekle</Button>}
    />
  )
  
  return <ProductTable data={data.items} />
}
```

---

## Para ve Tarih Formatlama

```typescript
// ✅ DOĞRU — helper kullan
import { formatCurrency, formatDate } from '@/lib/formatters';

<span>{formatCurrency(product.price)}</span>     // 1.250,00 ₺
<span>{formatDate(order.createdAt)}</span>         // 15 Oca 2025

// ❌ YANLIŞ — direkt format
<span>{product.price} TL</span>
<span>{new Date(order.createdAt).toLocaleDateString()}</span>
```

---

## Form Kuralları

```typescript
// React Hook Form + Zod validation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Ürün adı zorunlu').max(200),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Geçerli bir fiyat girin'),
  categoryId: z.string().uuid().optional(),
});

const form = useForm({ resolver: zodResolver(schema) });

// Submit handler
const onSubmit = form.handleSubmit(async (data) => {
  await createProduct(data);
});
```

---

## Server vs Client Component Kuralları

```typescript
// Server Component (default — tercih et)
// Veri fetch, metadata, statik render için
export default async function ProductsPage() {
  const products = await getProducts(); // Direkt DB veya API
  return <ProductList initialData={products} />
}

// Client Component — sadece gerektiğinde
'use client'; // ← Sadece şunlar için ekle:
// useState, useEffect, onClick, browser API, form, realtime

// ❌ Gereksiz 'use client' kullanma
// Tüm sayfayı client yapmak yerine sadece interaktif parçayı client yap
```

---

## Zustand Store Kuralları

```typescript
// Sadece şu durumlarda store kullan:
// 1. Satış konsolu (POS) gibi gerçek zamanlı ve karmaşık state
// 2. Authentication state (token, user bilgisi)
// 3. Birden fazla component'in aynı anda okuyup yazdığı state

// Basit sayfa state'i için → useState yeterli
// Server state için → TanStack Query yeterli (store kullanma)
```

---

## Yetkisiz Erişim Yönetimi

```typescript
// Route seviyesinde (layout.tsx içinde)
const user = await getCurrentUser();
if (!user) redirect('/login');
if (!hasPermission(user.role, 'products:write')) {
  redirect('/unauthorized');
}

// Bileşen seviyesinde (ince kontrol)
{hasPermission(user.role, 'products:delete') && (
  <Button variant="destructive" onClick={handleDelete}>Sil</Button>
)}
```

---

## Build Doğrulaması

Bu klasörde her değişiklik sonrası:

```bash
npm run build --workspace=apps/web
npm run lint --workspace=apps/web
```

TypeScript hataları ve lint uyarıları temizlenmeden teslim edilmez.
