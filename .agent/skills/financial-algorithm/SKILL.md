---
name: financial-algorithm
description: SoftShopping finansal hesaplama uzmanı — kampanya maliyet dağıtımı, kar marjı, FIFO, KDV hesaplamaları
---

# Financial Algorithm — SoftShopping

## Amaç
Tüm finansal hesaplamaların doğru, tutarlı ve denetlenebilir olmasını sağlar. Para birimi: TRY, hassasiyet: Decimal(12,2).

## Altın Kurallar

1. **ASLA floating-point aritmetik kullanma** → Her zaman `Decimal` veya integer cents
2. **ASLA para tutarını `number` tipi ile sakla** → Prisma `Decimal(12,2)`
3. **Kuruş kaybı kontrolü**: Toplam, alt kalemlerin toplamına eşit olmalı

## Kampanya Maliyet Dağıtımı

İndirim, satış kalemlerine **satır değerine orantılı** olarak dağıtılır:

```typescript
function distributeDiscount(items: CartItem[], totalDiscount: number): CartItem[] {
  const cartTotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  let remaining = totalDiscount;

  return items.map((item, idx) => {
    const lineTotal = item.unitPrice * item.quantity;
    const ratio = lineTotal / cartTotal;
    // Son kalem: kalan tutarı al (kuruş kaybını önle)
    const discount = idx === items.length - 1
      ? remaining
      : Math.round(totalDiscount * ratio * 100) / 100;
    remaining -= discount;
    return { ...item, discountAmount: discount };
  });
}
```

## Kar Marjı Hesaplama

```typescript
// Brüt kar marjı (%)
const grossMargin = ((salePrice - costPrice) / salePrice) * 100;

// Markup (%)
const markup = ((salePrice - costPrice) / costPrice) * 100;

// KDV dahil fiyat
const priceWithKdv = netPrice * (1 + kdvRate / 100);

// KDV hariç fiyat
const priceWithoutKdv = grossPrice / (1 + kdvRate / 100);
```

## FIFO Maliyet Hesaplama

Stok maliyeti FIFO (İlk Giren İlk Çıkar) yöntemiyle hesaplanır:

```typescript
function calculateFifoCost(movements: StockMovement[], soldQuantity: number): number {
  const sorted = movements
    .filter(m => m.type === 'PURCHASE')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  let remaining = soldQuantity;
  let totalCost = 0;

  for (const movement of sorted) {
    const take = Math.min(remaining, movement.quantity);
    totalCost += take * movement.unitCost;
    remaining -= take;
    if (remaining <= 0) break;
  }

  return totalCost;
}
```

## KDV Hesaplama Kuralları

| İşlem | Formül |
|-------|--------|
| KDV Tutarı | `netAmount * kdvRate / 100` |
| KDV Dahil → Matrah | `grossAmount / (1 + kdvRate / 100)` |
| Matrah → KDV Dahil | `netAmount * (1 + kdvRate / 100)` |
| Toplam KDV | `Σ (item.netAmount * item.kdvRate / 100)` |

## Modül Kullanımları

| Modül | Algoritma |
|-------|-----------|
| Kampanya | Ağırlıklı maliyet dağıtımı, X al Y öde |
| Satış | FIFO maliyet, KDV hesaplama, kuruş yuvarlama |
| Cari Hesap | Bakiye güncelleme, kredi limit kontrolü |
| Raporlama | Kar marjı, brüt/net ciro, dönemsel karşılaştırma |
| Gider | Gelir-gider net hesaplama, kategori dökümü |
