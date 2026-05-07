# Partner Finance Receipt PDF Design

**Tarih:** 2026-05-07
**Versiyon:** 1.0

---

## 1. Overview

Cari Hesap Makbuzu PDF'i, `/finance/operations` sayfasındaki partner finans operasyonları (tahsilat, ödeme, bordro fişleri) için profesyonel PDF şablonu üretir. Mevcut `ExportService.generateCustomerStatementPdf()` altyapısını genişleterek aynı görsel dili, kağıt boyutu (A4/A5) ve yönlendirme (portrait/landscape) seçeneklerini kullanır.

---

## 2. Görsel Dil

`generateCustomerStatementPdf()` ile tamamen aynı palette ve tipografiyi kullanır:

| Element | Değer |
|---------|-------|
| Primary ink | `#0f172a` |
| Muted text | `#64748b` |
| Row alternate | `#f8fafc` |
| Accent line | `#2563eb` |
| Border | `#e2e8f0` |
| Font | Noto Sans (fallback: DejaVu Sans → Helvetica) |
| Balance negatif | `#b91c1c` (kırmızı) |

---

## 3. Kağıt ve Yönlendirme

| Parametre | Değerler | Varsayılan |
|----------|----------|------------|
| `paper` | `A4`, `A5` | `A4` |
| `orientation` | `portrait`, `landscape` | `portrait` |

Tüm boyut kombinasyonları `generateCustomerStatementPdf()` ile aynı scale/formül mantığı ile hesaplanır.

---

## 4. PDF Yapısı

```
┌──────────────────────────────────────────────────────┐
│  [tenant logo placeholder]                           │
│  FİRMA ADI                                           │
│  Cari Hesap Makbuzu              Tarih: DD/MM/YYYY  │
│  ────────────────────────────────────────────────────│
│  Belge No: XXXXX         İşlem Türü: XXXXXXXXX       │
│  Cari   : XXXXXXXXXX     Tutar     : ₺ X.XXX,XX      │
│  ────────────────────────────────────────────────────│
│  AÇIKLAMA                               TUTAR (₺)  │
│  ────────────────────────────────────────────────────│
│  [satır...]                                          │
│  ────────────────────────────────────────────────────│
│  Borç ₺ X.XXX,XX        Alacak ₺ X.XXX,XX           │
│  ══════════════════════════════════════════════════  │
│  Hazırlayan: _______      Onay: _______              │
│  ────────────────────────────────────────────────────│
│  SoftShopping Makbuz          Sayfa X · Oluşturma: .. │
└──────────────────────────────────────────────────────┘
```

### Header
- `tenant.name` bold başlık
- Altında tarih + "Cari Hesap Makbuzu" başlık
- Accent çizgisi (mavi, 1.5pt)

### Bilgi Kartı
Tek satırda 4 alan: Belge No | İşlem Türü | Cari | Tutar

### Tablo
| Tarih | Belge No | Açıklama | Tutar |
|-------|----------|----------|-------|

Tablo satırları alternating row background ile, yeni sayfada header tekrarlanır.

### Özet + İmza
- Borç / Alacak toplamı bold
- İmza satırı: Hazırlayan | Onay

### Footer
- "SoftShopping Makbuz" + sayfa numarası + oluşturma tarihi

---

## 5. API

### Yeni Endpoint

```
GET /api/v1/partner-finance/operations/:id/receipt/pdf
  Query: paper=A4|A5 (opsiyonel)
          orientation=portrait|landscape (opsiyonel)
  Response: application/pdf
  Header: Content-Disposition: attachment; filename=makbuz_<documentNo>.pdf
```

### Mevcut Endpoint Korunur
`GET /partner-finance/operations/:id/receipt` → metin makbuz (geriye uyumluluk)

---

## 6. Etkilenen Dosyalar

### Backend
| Dosya | Değişiklik |
|-------|-----------|
| `apps/api/src/common/services/export.service.ts` | `generatePartnerFinanceReceiptPdf()` metodu ekle |
| `apps/api/src/modules/partner-finance/partner-finance.controller.ts` | `GET /partner-finance/operations/:id/receipt/pdf` endpoint ekle |
| `apps/api/src/modules/partner-finance/partner-finance.service.ts` | `generateOperationReceiptPdf()` → `ExportService` çağırır |

### Frontend
| Dosya | Değişiklik |
|-------|-----------|
| `apps/web/src/app/(main)/finance/operations/page.tsx` | Print butonu → PDF endpoint, blob iframe preview |
| `apps/web/src/app/(main)/finance/operations/[id]/page.tsx` | Kağıt/yön seçiciler + İndir butonu ekle |

---

## 7. Doğrulama

```bash
npm run build --workspace=apps/api
npx prisma validate && npx prisma generate
npm run build --workspace=apps/web
```
