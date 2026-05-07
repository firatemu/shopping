# SoftShopping Shared Types — Agent Kuralları

> Bu pakette yapılan her değişiklik API, Web ve Mobile katmanlarını etkiler.
> Atlas (Tech Lead) bu pakette yapılan tüm değişiklikleri onaylamalıdır.

## Bu Klasörde Çalışırken

- Atlas (Tech Lead) birincil aktiftir
- Bora, Ece ve Yusuf tüketici olarak değerlendirilmelidir
- Her değişiklik sonrası üç katman da build edilmelidir

---

## Değişiklik Kuralları

### Breaking Change Protokolü
```
1. Yeni alan eklemek → güvenli (optional ile ekle)
2. Alan tipini değiştirmek → BREAKING (Atlas onayı + tüm katmanlar güncellenmeli)
3. Alan kaldırmak → BREAKING (önce deprecated işaretle, 1 sprint sonra kaldır)
4. Enum değeri eklemek → güvenli
5. Enum değeri kaldırmak → BREAKING
```

### Tip Tanımlama Kuralları
```typescript
// Para alanları string olarak (Decimal'den gelir)
price: string;  // "29.99" — number değil

// UUID'ler string
tenantId: string;
productId: string;

// Tarihler ISO string
createdAt: string;  // "2025-01-15T10:30:00Z"

// Opsiyonel alanlar explicit optional
categoryId?: string;
deletedAt?: string | null;
```

---

## Build Doğrulaması

Shared-types değişikliğinden sonra:
```bash
npm run build --workspace=packages/shared-types
npm run build --workspace=apps/api
npm run build --workspace=apps/web
npx tsc --noEmit --project apps/mobile/tsconfig.json
```

Hepsi geçmedikçe değişiklik tamamlanmış sayılmaz.
