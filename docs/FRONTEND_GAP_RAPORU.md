# SoftShopping — Backend / Frontend Gap Analizi

**Tarih:** 7 Mayıs 2026  
**Amac:** Backend'de var olan ama frontend'de kullanılmayan (veya hiç olmayan) özellikleri tespit etmek. Bu rapor frontend güncelleme sprint'leri için rehber görevi görür.

---

## Genel Durum Özeti

| Alan | Backend (API) | Frontend (Web) | Durum |
|------|--------------|----------------|-------|
| Toplam Modül | 22 | 22 | ✅ Hepsi mevcut |
| Toplam Endpoint | ~133 | — | — |
| Toplam Sayfa | — | 31 | — |
| **Eksik Sayfa** | — | **~25 sayfa** | ⚠️ |
| **Eksik Endpoint Entegrasyonu** | — | **~60+ çağrı** | ⚠️ |

---

## Modül Bazli Gap Analizi

---

### 1. Branch (Şube Yönetimi)

#### Backend Endpoint'leri
| Method | Route | Açıklama |
|--------|-------|-----------|
| `GET` | `/branches` | Şube listesi |
| `POST` | `/branches` | Şube oluştur |
| `GET` | `/branches/:id` | Şube detayı |
| `PUT` | `/branches/:id` | Şube güncelle |
| `DELETE` | `/branches/:id` | Şube sil |
| `POST` | `/branches/transfers` | Stok transferi oluştur |
| `POST` | `/branches/transfers/:id/receive` | Transfer teslim al |
| `GET` | `/branches/transfers/list` | Transfer listesi |

#### Frontend Durumu
| Yol | Durum |
|-----|--------|
| `/branches` | ❌ **YOK** |
| `/branches/transfers` | ❌ **YOK** |
| `/branches/transfers/new` | ❌ **YOK** |
| Transfer teslim alma akışı | ❌ **YOK** |

**Öncelik:** Orta — Çok şubeli mağazalar için kritik

---

### 2. Campaign (Kampanya Yönetimi)

#### Backend Endpoint'leri
| Method | Route | Açıklama |
|--------|-------|-----------|
| `GET` | `/campaigns` | Kampanya listesi |
| `POST` | `/campaigns` | Kampanya oluştur |
| `GET` | `/campaigns/:id` | Kampanya detayı |
| `PUT` | `/campaigns/:id` | Kampanya güncelle |
| `DELETE` | `/campaigns/:id` | Kampanya sil |
| `POST` | `/campaigns/calculate` | Kampanya önizleme/hesapla |
| `POST` | `/campaigns/vouchers` | Çek kodu üret |
| `GET` | `/campaigns/vouchers` | Çek listesi |
| `GET` | `/campaigns/vouchers/:code` | Çek detayı (kod ile) |

#### Frontend Durumu
| Yol | Durum | Açıklama |
|-----|--------|-----------|
| `/campaigns` | ⚠️ Kısmi | Sadece liste — güncelle/sil butonu yok |
| `/campaigns/new` | ✅ | Kampanya oluşturma formu |
| Kampanya hesapla/önizleme | ❌ **YOK** | Kampanya etkisi simülasyonu |
| `/campaigns/:id` (edit) | ❌ **YOK** | Güncelleme formu yok |
| Çek kodu yönetimi | ❌ **YOK** | Voucher üretimi ve listesi yok |

**Eksik Sayfalar:**
- `/campaigns/[id]/edit` — kampanya düzenleme formu
- Kampanya hesaplama/önizleme modal veya sayfası

**Eksik Entegrasyonlar:**
- `POST /campaigns/calculate` → POS'da sepet anında kampanya etkisi göstergesi
- `POST /campaigns/vouchers` → POS'da voucher üretimi
- `GET /campaigns/vouchers/:code` → POS'da voucher sorgulama

**Öncelik:** Yüksek — Kampanya yönetimi eksik

---

### 3. Cash Register (Kasa Yönetimi)

#### Backend Endpoint'leri
| Method | Route | Açıklama |
|--------|-------|-----------|
| `POST` | `/cash-register/open` | Kasa aç |
| `POST` | `/cash-register/:id/close` | Kasa kapat |
| `POST` | `/cash-register/:id/adjust` | Kasa düzeltme |
| `POST` | `/cash-register/:id/movement` | Nakit giriş/çıkış |
| `GET` | `/cash-register/current` | Açık kasa oturumu |
| `GET` | `/cash-register/sessions` | Geçmiş oturumlar |

#### Frontend Durumu
| Yol | Durum | Açıklama |
|-----|--------|-----------|
| `/cash-register` | ⚠️ Kısmi | Sadece oturum listesi — aç/kapa/movement yok |
| Kasa açma formu | ❌ **YOK** | `/cash-register/open` |
| Kasa kapatma formu | ❌ **YOK** | `/cash-register/:id/close` |
| Kasa düzeltme | ❌ **YOK** | `/cash-register/:id/adjust` |
| Nakit hareketi girişi | ❌ **YOK** | Para çekme/yatırma |

**Eksik Sayfalar:**
- Kasa açma sayfası (başlangıç bakiyesi girişi)
- Kasa kapatma sayfası (fark raporu ile)
- Kasa düzeltme sayfası (nakit giriş/çıkış)

**Eksik Entegrasyonlar:**
- `POST /cash-register/open` → Kasiyer giriş akışı
- `POST /cash-register/:id/close` → Kasa kapatma
- `POST /cash-register/:id/adjust` → Manuel düzeltme
- `POST /cash-register/:id/movement` → Nakit çekme/yatırma

**Öncelik:** Yüksek — Kasa yönetimi temel işlev

---

### 4. Catalog (Katalog Yönetimi)

#### Backend Endpoint'leri
| Route | Açıklama |
|-------|-----------|
| `GET/POST /catalog/categories` | Kategori CRUD |
| `PUT/DELETE /catalog/categories/:id` | Kategori güncelle/sil |
| `GET/POST /catalog/brands` | Marka CRUD |
| `PUT/DELETE /catalog/brands/:id` | Marka güncelle/sil |
| `GET/POST /catalog/colors` | Renk CRUD |
| `PUT/DELETE /catalog/colors/:id` | Renk güncelle/sil |
| `GET/POST /catalog/size-sets` | Beden seti CRUD |
| `PUT/DELETE /catalog/size-sets/:id` | Beden seti güncelle/sil |

#### Frontend Durumu
| Yol | Durum | Açıklama |
|-----|--------|-----------|
| `/products/categories` | ⚠️ Kısmi | Liste + yeni — düzenleme/silme butonu? |
| `/products/brands` | ⚠️ Kısmi | Liste + yeni — düzenleme/silme butonu? |
| `/products/attributes` | ⚠️ Kısmi | Boyut/renk grid görünümü |
| `/products/variations` | ⚠️ Kısmi | Varyasyon listesi |
| `/products/colors` | ❌ **YOK** | Renk yönetimi sayfası yok |
| `/products/size-sets` | ❌ **YOK** | Beden seti yönetimi sayfası yok |

**Eksik Sayfalar:**
- Renk yönetimi sayfası (renk kodu ile)
- Beden seti yönetimi sayfası (ölçü grubu tanımlama)
- Katalog öznitelik (attribute) düzenleme/silme akışı

**Öncelik:** Orta

---

### 5. Customer (Cari Hesap)

#### Backend Endpoint'leri
| Method | Route | Açıklama |
|--------|-------|-----------|
| `GET` | `/customers` | Cari listesi |
| `POST` | `/customers` | Cari oluştur |
| `GET` | `/customers/overdue` | Vadesi geçmiş cariler |
| `GET` | `/customers/:id` | Cari detayı |
| `PUT` | `/customers/:id` | Cari güncelle |
| `DELETE` | `/customers/:id` | Cari sil |
| `POST` | `/customers/payments` | Ödeme kaydet |
| `GET` | `/customers/:id/orders` | Cariye ait siparişler |
| `GET` | `/customers/:id/summary` | Cari özet bilgisi |
| `GET` | `/customers/:id/statement` | Cari ekstre |
| `GET` | `/customers/:id/statement/export/excel` | Excel'e aktar |
| `GET` | `/customers/:id/statement/export/pdf` | PDF'e aktar |
| `GET` | `/customers/:id/movements` | Cari hareketleri |

#### Frontend Durumu
| Yol | Durum | Açıklama |
|-----|--------|-----------|
| `/customers` | ⚠️ Kısmi | Liste var — eksik: overdue, silme? |
| `/customers/new` | ✅ | Cari oluşturma |
| `/customers/[id]` | ⚠️ Kısmi | Detay sayfası var |
| `/customers/[id]/edit` | ⚠️ Kısmi | Düzenleme var |
| `/customers/[id]/movements` | ⚠️ Kısmi | Hareketler sayfası var |
| `/customers/[id]/statement/preview` | ⚠️ Kısmi | Ekstre önizleme var |
| `/customers/overdue` | ❌ **YOK** | Vadesi geçmiş cariler listesi |
| `/customers/:id/orders` | ❌ **YOK** | Cari siparişleri sayfası |
| `/customers/:id/summary` | ❌ **YOK** | Cari özet kartı (borç/alacak/çek/senet) |
| `/customers/:id/statement/export/excel` | ❌ **YOK** | Excel export butonu/tetikleyicisi |
| `/customers/:id/statement/export/pdf` | ❌ **YOK** | PDF export butonu/tetikleyicisi |
| `/customers/payments` | ❌ **YOK** | Cari ödeme kaydetme formu |

**Eksik Sayfalar:**
- Vadesi geçmiş cariler listesi (`/customers/overdue`)
- Cari siparişleri listesi
- Cari özet kartı (düzenleme sayfasına entegre edilebilir)
- Cari hareket raporuna export butonları

**Eksik Entegrasyonlar:**
- `GET /customers/overdue` → Müşteri listesinde filtre olarak
- `POST /customers/payments` → Cari ödeme/tahsilat formu
- `GET /customers/:id/summary` → Cari detay sayfasına özet kartı

**Öncelik:** Yüksek — Cari hesap yönetimi temel işlev

---

### 6. Expense (Gelir/Gider)

#### Backend Endpoint'leri
| Method | Route | Açıklama |
|--------|-------|-----------|
| `GET` | `/expenses` | Kayıt listesi |
| `POST` | `/expenses` | Kayıt oluştur |
| `GET` | `/expenses/:id` | Kayıt detayı |
| `PUT` | `/expenses/:id` | Kayıt güncelle |
| `DELETE` | `/expenses/:id` | Kayıt sil |
| `GET` | `/expenses/summary` | Özet raporu |
| `GET/POST` | `/expenses/categories` | Kategori listesi/oluştur |
| `GET` | `/expenses/categories/:categoryId/report` | Kategori bazlı rapor |

#### Frontend Durumu
| Yol | Durum | Açıklama |
|-----|--------|-----------|
| `/expenses` | ⚠️ Kısmi | Liste var |
| `/expenses/new` | ✅ | Gelir/gider formu |
| `/expenses/categories/[id]` | ⚠️ Kısmi | Kategori sayısı görünüyor |
| `/expenses/summary` | ❌ **YOK** | Özet raporu sayfası yok |
| Kategori bazlı rapor | ❌ **YOK** | Kategori detay raporu yok |
| Kategori CRUD | ❌ **YOK** | Kategori oluşturma/düzenleme akışı yok |

**Eksik Sayfalar:**
- Gelir/Gider özet raporu (`/expenses/summary`)
- Kategori bazlı detay raporu (kategori sayfasına entegre)

**Eksik Entegrasyonlar:**
- `GET /expenses/summary` → Dashboard'a gelir/gider özeti widget'ı
- `POST /expenses/categories` → Kategori oluşturma
- `GET /expenses/categories/:id/report` → Kategori detay sayfası

**Öncelik:** Orta

---

### 7. Gift Voucher (Hediye Çeki)

#### Backend Endpoint'leri
| Method | Route | Açıklama |
|--------|-------|-----------|
| `POST` | `/gift-vouchers` | Hediye çeki oluştur |
| `GET` | `/gift-vouchers` | Liste |
| `GET` | `/gift-vouchers/lookup` | Kod ile sorgula |
| `GET` | `/gift-vouchers/:id` | Detay |

#### Frontend Durumu
| Yol | Durum | Açıklama |
|-----|--------|-----------|
| `/gift-vouchers` | ⚠️ Kısmi | Sadece liste — oluşturma butonu ve formu yok |
| Kod ile sorgulama | ❌ **YOK** | POS veya sayfa içinde kodu sorgulama |
| Hediye çeki oluşturma formu | ❌ **YOK** | Yeni çek üretme |

**Eksik Sayfalar:**
- Hediye çeki oluşturma (`/gift-vouchers/new`)

**Eksik Entegrasyonlar:**
- `POST /gift-vouchers` → Çek üretim formu
- `GET /gift-vouchers/lookup` → POS'da çek sorgulama
- Barkod ile çek sorgulama (barkod scanner entegrasyonu)

**Öncelik:** Orta

---

### 8. Integration (E-ticaret Entegrasyonu)

#### Backend Endpoint'leri
| Method | Route | Açıklama |
|--------|-------|-----------|
| `GET` | `/integrations` | Entegrasyon listesi |
| `POST` | `/integrations/connect` | Bağlantı kur |
| `POST` | `/integrations/:type/disconnect` | Bağlantı kes |
| `POST` | `/integrations/:type/pause` | Duraklat |
| `GET` | `/integrations/:type/status` | Durum kontrolü |

#### Frontend Durumu
| Yol | Durum |
|-----|--------|
| Entegrasyon yönetim sayfası | ❌ **YOK** |

**Eksik Sayfalar:**
- `/integrations` — Entegrasyon listesi ve bağlantı yönetimi
- `/integrations/[type]` — Tekil entegrasyon ayarları

**Öncelik:** Düşük — E-ticaret entegrasyonu ileri aşamada

---

### 9. Inventory (Envanter/Stok)

#### Backend Endpoint'leri
| Method | Route | Açıklama |
|--------|-------|-----------|
| `GET` | `/inventory/movements` | Stok hareketleri |
| `GET` | `/inventory/summary` | Stok özeti |
| `GET` | `/inventory/alerts` | Kritik stok uyarıları |
| `GET` | `/inventory/movements/:variantId` | Varyasyona ait hareketler |
| `PATCH` | `/inventory/bulk-adjust` | Toplu stok düzeltme |
| `POST` | `/inventory/reserve` | Stok rezerve et |
| `POST` | `/inventory/release/:variantId` | Rezervasyonu serbest bırak |

#### Frontend Durumu
| Yol | Durum | Açıklama |
|-----|--------|-----------|
| `/inventory` | ⚠️ Kısmi | Hareketler ve özet var |
| Kritik stok uyarıları | ❌ **YOK** | Dashboard KPI'sı dışında uyarı sayfası yok |
| Toplu stok düzeltme | ❌ **YOK** | Bulk-adjust formu yok |
| Stok rezervasyonu | ❌ **YOK** | Manuel rezervasyon yönetimi yok |

**Eksik Sayfalar:**
- Kritik stok uyarıları detay sayfası
- Toplu stok düzeltme sayfası (bulk-adjust formu)

**Eksik Entegrasyonlar:**
- `GET /inventory/alerts` → Dashboard'da düşük stok KPI'sı dışında detay
- `PATCH /inventory/bulk-adjust` → Stok düzeltme formu
- `POST /inventory/reserve` → Manuel rezervasyon
- `POST /inventory/release/:variantId` → Manuel rezervasyon iptali

**Öncelik:** Orta

---

### 10. Label Template (Etiket Şablonu)

#### Backend Endpoint'leri
| Method | Route | Açıklama |
|--------|-------|-----------|
| `GET/POST` | `/label-templates` | Liste ve oluştur |
| `GET` | `/label-templates/:id` | Detay |
| `PATCH` | `/label-templates/:id` | Güncelle |
| `DELETE` | `/label-templates/:id` | Sil |

#### Frontend Durumu
| Yol | Durum |
|-----|--------|
| `/products/label-designer` | ⚠️ Kısmi — Sadece varyasyon label print görünümü |
| `/label-templates` (tam yönetim) | ❌ **YOK** |

**Eksik Sayfalar:**
- Etiket şablonu listesi ve CRUD yönetimi
- Şablon oluşturma/düzenleme (ZPL veya visual designer)
- Şablon önizleme ve yazdırma

**Öncelik:** Düşük

---

### 11. Notification (Bildirim)

#### Backend Endpoint'leri
| Method | Route | Açıklama |
|--------|-------|-----------|
| `GET` | `/notifications` | Bildirim listesi |
| `PATCH` | `/notifications/:id/read` | Okundu işaretle |
| `PATCH` | `/notifications/read-all` | Tümünü okundu işaretle |
| `POST` | `/notifications/send` | Bildirim gönder |

#### Frontend Durumu
| Yol | Durum |
|-----|--------|
| Bildirim sayfası | ❌ **YOK** |

**Eksik Sayfalar:**
- Bildirim listesi sayfası
- Okunmamış bildirim sayısı badge'i (layout header'da)

**Eksik Entegrasyonlar:**
- `GET /notifications` → Bildirim listesi
- `PATCH /notifications/:id/read` → Bildirim okundu işaretleme
- `PATCH /notifications/read-all` → Tümünü okundu işaretleme
- WebSocket ile anlık bildirim (real-time `notification:new` event)

**Öncelik:** Orta

---

### 12. Partner Finance (Banka ve Finans Operasyonları)

#### Backend Endpoint'leri

**Banka Hesapları:**
| Method | Route | Açıklama |
|--------|-------|-----------|
| `GET/POST` | `/bank-accounts` | Liste ve oluştur |
| `GET` | `/bank-accounts/:id` | Detay |
| `GET` | `/bank-accounts/:id/movements` | Hesap hareketleri |
| `PATCH` | `/bank-accounts/:id` | Güncelle |
| `DELETE` | `/bank-accounts/:id` | Sil |

**Finans Operasyonları:**
| Method | Route | Açıklama |
|--------|-------|-----------|
| `GET/POST` | `/partner-finance/operations` | Liste ve oluştur |
| `GET` | `/partner-finance/operations/upcoming-instruments` | Yaklaşan çek/senet |
| `GET` | `/partner-finance/operations/:id` | Detay |
| `PATCH` | `/partner-finance/operations/:id` | Güncelle |
| `DELETE` | `/partner-finance/operations/:id` | Sil |

#### Frontend Durumu
| Yol | Durum | Açıklama |
|-----|--------|-----------|
| `/finance/bank-accounts` | ⚠️ Kısmi | Liste var — hareketler yok |
| `/finance/bank-accounts/new` | ✅ | Yeni hesap formu |
| `/finance/operations` | ⚠️ Kısmi | Liste var |
| `/finance/operations/new` | ✅ | Yeni operasyon formu |
| Banka hesap hareketleri | ❌ **YOK** | Hesap detayı + hareket listesi |
| Banka hesap düzenleme | ❌ **YOK** | Güncelleme formu |
| Yaklaşan çek/senet | ❌ **YOK** | Vadesi gelen çek-senet listesi |
| Operasyon düzenleme/silme | ❌ **YOK** | Detay sayfasında düzenle/sil |

**Eksik Sayfalar:**
- Banka hesap detay sayfası (hareketler ile)
- Banka hesap düzenleme formu
- Operasyon detay sayfası (güncelleme/silme ile)
- Yaklaşan çek/senet sayfası (`/finance/upcoming-instruments`)

**Eksik Entegrasyonlar:**
- `GET /bank-accounts/:id/movements` → Hesap detay sayfası
- `GET /partner-finance/operations/upcoming-instruments` → Dashboard widget veya rapor

**Öncelik:** Orta

---

### 13. Product (Ürün Yönetimi)

#### Backend Endpoint'leri
| Method | Route | Açıklama |
|--------|-------|-----------|
| `GET/POST` | `/products` | Liste ve oluştur |
| `GET` | `/products/variants` | Varyasyon listesi |
| `GET` | `/products/:id` | Detay |
| `PUT` | `/products/:id` | Güncelle |
| `DELETE` | `/products/:id` | Sil |
| `POST` | `/products/:id/variants` | Varyasyon ekle |
| `POST` | `/products/:id/variants/bulk` | Toplu varyasyon ekle |
| `POST` | `/products/barcodes/lookup` | Barkod ile ürün bul |
| `POST` | `/products/images/upload` | Görsel yükle |

#### Frontend Durumu
| Yol | Durum | Açıklama |
|-----|--------|-----------|
| `/products` | ⚠️ Kısmi | Liste var |
| `/products/new` | ⚠️ Kısmi | Form var |
| `/products/[id]` | ⚠️ Kısmi | Detay var |
| `/products/variations` | ⚠️ Kısmi | Varyasyon listesi |
| `/products/categories` | ⚠️ Kısmi | Kategori sayfası |
| `/products/brands` | ⚠️ Kısmi | Marka sayfası |
| `/products/attributes` | ⚠️ Kısmi | Varyasyon grid |
| Barkod ile arama | ❌ **YOK** | Ayrı barkod arama sayfası yok |
| Toplu varyasyon ekleme | ❌ **YOK** | Bulk varyasyon formu yok |
| Ürün görsel yükleme (ürün detayında) | ❌ **YOK** | Detay sayfasında görsel ekleme/silme |

**Eksik Sayfalar:**
- Barkodlu ürün arama sayfası (`/products/barcode-search`)
- Toplu varyasyon ekleme sayfası

**Eksik Entegrasyonlar:**
- `POST /products/barcodes/lookup` → POS veya ürün sayfasında barkod arama
- `POST /products/:id/variants/bulk` → Varyasyon bulk ekleme
- `POST /products/images/upload` → Ürün detay sayfasında görsel yükleme

**Öncelik:** Orta

---

### 14. Receipt (Fiş)

#### Backend Endpoint'leri
| Method | Route | Açıklama |
|--------|-------|-----------|
| `GET` | `/receipts/:orderId` | Siparişe ait fiş |

#### Frontend Durumu
| Yol | Durum |
|-----|--------|
| Fiş görüntüleme | ❌ **YOK** |
| Fiş yazdırma | ❌ **YOK** |

**Eksik Sayfalar:**
- Fiş görüntüleme sayfası (`/receipts/[orderId]`)
- Fiş PDF/çıktı görünümü

**Eksik Entegrasyonlar:**
- `GET /receipts/:orderId` → Sipariş detay sayfasından fiş görüntüleme
- Fiş yazdırma (yazıcıya gönderme)

**Öncelik:** Yüksek — Satış sonrası müşteri fişi

---

### 15. Reporting (Raporlama)

#### Backend Endpoint'leri
| Method | Route | Açıklama |
|--------|-------|-----------|
| `GET` | `/reports/dashboard` | Dashboard KPI'ları |
| `GET` | `/reports/daily-sales` | Günlük satış |
| `GET` | `/reports/top-products` | En çok satan ürünler |
| `GET` | `/reports/dead-stock` | Ölü stok |
| `GET` | `/reports/daily-summary` | Günlük özet |
| `GET` | `/reports/sales-trend` | Satış trendi |
| `GET` | `/reports/sales` | Satış raporu |
| `GET` | `/reports/stock-overview` | Stok özeti |
| `GET` | `/reports/cash-sessions` | Kasa oturumları raporu |
| `GET` | `/reports/daily-sales/excel` | Excel export |
| `GET` | `/reports/top-products/excel` | Excel export |
| `GET` | `/reports/daily-sales/pdf` | PDF export |

#### Frontend Durumu
| Yol | Durum | Açıklama |
|-----|--------|-----------|
| `/reports` | ⚠️ Kısmi | Rapor seçim sayfası — tüm raporlar listeleniyor |
| Dashboard KPI'ları | ⚠️ Kısmi | `/dashboard` — bazı kartlar var |
| Rapor detay sayfaları | ❌ **YOK** | Her rapor tipi için ayrı sayfa yok |
| Excel/PDF export | ❌ **YOK** | Raporlarda export butonu yok |
| Ölü stok raporu | ❌ **YOK** | `/reports/dead-stock` |
| Satış trend raporu | ❌ **YOK** | `/reports/sales-trend` |
| Stok özeti raporu | ❌ **YOK** | `/reports/stock-overview` |
| Kasa oturumları raporu | ❌ **YOK** | `/reports/cash-sessions` |

**Eksik Sayfalar:**
- Rapor detay sayfaları (her rapor tipi için)
- Ölü stok raporu
- Satış trend analizi
- Stok özeti raporu
- Kasa oturumları raporu
- Excel/PDF export görünümleri

**Eksik Entegrasyonlar:**
- Tüm `GET /reports/*` endpoint'leri → Rapor sayfalarında veri çekme
- `GET /reports/*/excel` → Excel export butonu/tetikleyicisi
- `GET /reports/*/pdf` → PDF export butonu/tetikleyicisi

**Öncelik:** Yüksek — Raporlama eksik

---

### 16. Sales (Satış)

#### Backend Endpoint'leri
| Method | Route | Açıklama |
|--------|-------|-----------|
| `POST` | `/sales/checkout` | Satış tamamla |
| `POST` | `/sales/returns` | İade işle |
| `GET` | `/sales/orders` | Sipariş listesi |
| `GET` | `/sales/orders/:id` | Sipariş detayı |

#### Frontend Durumu
| Yol | Durum | Açıklama |
|-----|--------|-----------|
| `/pos` | ⚠️ Kısmi | Checkout kullanılıyor |
| `/pos` (iade) | ⚠️ Kısmi | İade formu var |
| `/sales/orders` | ❌ **YOK** | Sipariş listesi sayfası yok |
| `/sales/orders/[id]` | ❌ **YOK** | Sipariş detay sayfası yok |

**Eksik Sayfalar:**
- Sipariş listesi (`/sales/orders`)
- Sipariş detay sayfası (`/sales/orders/[id]`)
- İade detay sayfası

**Eksik Entegrasyonlar:**
- `GET /sales/orders` → Sipariş listesi
- `GET /sales/orders/:id` → Sipariş detay
- İade edilen siparişlerin detaylı görünümü

**Öncelik:** Orta

---

### 17. Staff Performance (Personel Performansı)

#### Backend Endpoint'leri
| Method | Route | Açıklama |
|--------|-------|-----------|
| `POST` | `/staff-performance/targets` | Hedef oluştur |
| `GET` | `/staff-performance/targets` | Hedef listesi |
| `GET` | `/staff-performance/leaderboard` | Lider tablosu |
| `POST` | `/staff-performance/recalculate` | Yeniden hesapla |

#### Frontend Durumu
| Yol | Durum |
|-----|--------|
| Personel performans sayfası | ❌ **YOK** |

**Eksik Sayfalar:**
- Lider tablosu sayfası
- Satış hedefi oluşturma formu
- Personel performans detay sayfası

**Eksik Entegrasyonlar:**
- `GET /staff-performance/leaderboard` → Performans widget/dashboard kartı
- `POST /staff-performance/targets` → Hedef atama formu
- `POST /staff-performance/recalculate` → Manuel yeniden hesaplama

**Öncelik:** Düşük

---

### 18. Settings (Ayarlar)

#### Backend Durumu
- Sistem ayarları endpoint'i **yok**

#### Frontend Durumu
| Yol | Durum | Açıklama |
|-----|--------|-----------|
| `/settings` | ⚠️ Kısmi | Sayfa var — içerik kontrol edilmeli |

**Öncelik:** Düşük

---

### 19. WebSocket / Real-time Events

#### Backend Durumu
- WebSocket Gateway (`/ws`) mevcut
- `stock:updated`, `order:created`, `session:*` event'leri

#### Frontend Durumu
| Durum | Açıklama |
|-------|-----------|
| ❌ **YOK** | Socket.io client bağlantısı yok |
| ❌ **YOK** | Real-time event listener'ları yok |
| ❌ **YOK** | WebSocket hook'ları yok |

**Eksik:**
- `socket.io-client` paketi bağımlılığı yok
- `useWebSocket` veya `useRealtimeEvents` hook'ı yok
- Real-time event listener'ları (stok güncelleme, yeni sipariş bildirimi)

**Öncelik:** Orta

---

### 20. API Versioning (v2 API)

#### Backend Durumu
- `setGlobalPrefix('api/v1')` → Mevcut API v1

#### Frontend Durumu
- API çağrıları doğrudan `/api/v1` kullanıyor
- v2 API client hazırlığı **yok**

**Öncelik:** Düşük — İleri aşama için

---

## Eksik Sayfa Özeti (Sayisal)

| # | Sayfa Yolu | Öncelik |
|---|-----------|----------|
| 1 | `/branches` — Şube listesi ve yönetimi | Orta |
| 2 | `/branches/transfers` — Stok transferi listesi ve yönetimi | Orta |
| 3 | `/campaigns/[id]/edit` — Kampanya düzenleme | Yüksek |
| 4 | `/campaigns/calculate` — Kampanya hesaplama/önizleme | Yüksek |
| 5 | `/campaigns/vouchers` — Çek yönetimi | Orta |
| 6 | `/cash-register/open` — Kasa açma | Yüksek |
| 7 | `/cash-register/[id]/close` — Kasa kapatma | Yüksek |
| 8 | `/cash-register/[id]/adjust` — Kasa düzeltme | Yüksek |
| 9 | `/products/colors` — Renk yönetimi | Orta |
| 10 | `/products/size-sets` — Beden seti yönetimi | Orta |
| 11 | `/products/barcode-search` — Barkodlu arama | Orta |
| 12 | `/customers/overdue` — Vadesi geçmiş cariler | Yüksek |
| 13 | `/customers/[id]/payments` — Cari ödeme kaydetme | Yüksek |
| 14 | `/customers/[id]/orders` — Cari siparişleri | Orta |
| 15 | `/customers/[id]/statement/export` — Cari ekstre export | Orta |
| 16 | `/expenses/summary` — Gelir/Gider özet raporu | Orta |
| 17 | `/gift-vouchers/new` — Hediye çeki oluşturma | Orta |
| 18 | `/integrations` — E-ticaret entegrasyonları | Düşük |
| 19 | `/inventory/alerts` — Kritik stok uyarıları | Orta |
| 20 | `/inventory/bulk-adjust` — Toplu stok düzeltme | Orta |
| 21 | `/label-templates` — Etiket şablonu CRUD | Düşük |
| 22 | Bildirim sayfası (layout header badge + liste) | Orta |
| 23 | `/finance/bank-accounts/[id]` — Banka hesap detay + hareketler | Orta |
| 24 | `/finance/bank-accounts/[id]/edit` — Banka hesap düzenleme | Orta |
| 25 | `/finance/operations/upcoming` — Yaklaşan çek/senet | Orta |
| 26 | `/finance/operations/[id]` — Operasyon detay | Orta |
| 27 | `/receipts/[orderId]` — Fiş görüntüleme/yazdırma | Yüksek |
| 28 | `/reports/dead-stock` — Ölü stok raporu | Yüksek |
| 29 | `/reports/sales-trend` — Satış trend analizi | Yüksek |
| 30 | `/reports/stock-overview` — Stok özeti raporu | Yüksek |
| 31 | `/reports/cash-sessions` — Kasa oturumları raporu | Yüksek |
| 32 | `/reports/[type]` — Rapor detay sayfaları (genel) | Yüksek |
| 33 | `/sales/orders` — Sipariş listesi | Orta |
| 34 | `/sales/orders/[id]` — Sipariş detay | Orta |
| 35 | `/staff-performance` — Lider tablosu ve hedefler | Düşük |

---

## Frontend Sprint Öncelik Siralamasi

### Sprint 1 — Kritik İşlev (Bu sprint)

| Sayfa | Modül | Açıklama |
|-------|-------|-----------|
| `/campaigns/[id]/edit` | Campaign | Kampanya güncelleme formu |
| `/cash-register/open` | Cash Register | Kasa açma formu |
| `/cash-register/[id]/close` | Cash Register | Kasa kapatma formu |
| `/customers/overdue` | Customer | Vadesi geçmiş cariler |
| `/customers/[id]/payments` | Customer | Cari ödeme kaydetme |
| `/receipts/[orderId]` | Receipt | Fiş görüntüleme |
| `/reports/dead-stock` | Reporting | Ölü stok raporu |
| `/reports/cash-sessions` | Reporting | Kasa oturumları raporu |

### Sprint 2 — Yaygın Kullanım

| Sayfa | Modül | Açıklama |
|-------|-------|-----------|
| `/branches` | Branch | Şube listesi ve yönetimi |
| `/branches/transfers` | Branch | Stok transferi |
| `/campaigns/calculate` | Campaign | Kampanya hesaplama |
| `/campaigns/vouchers` | Campaign | Çek yönetimi |
| `/cash-register/adjust` | Cash Register | Kasa düzeltme |
| `/customers/[id]/orders` | Customer | Cari siparişleri |
| `/inventory/alerts` | Inventory | Kritik stok uyarıları |
| `/reports/sales-trend` | Reporting | Satış trendi |
| `/reports/stock-overview` | Reporting | Stok özeti |
| `/reports/[type]` | Reporting | Tüm rapor detay sayfaları |
| `/sales/orders` | Sales | Sipariş listesi |

### Sprint 3 — Genişletme

| Sayfa | Modül | Açıklama |
|-------|-------|-----------|
| `/products/colors` | Catalog | Renk yönetimi |
| `/products/size-sets` | Catalog | Beden seti yönetimi |
| `/products/barcode-search` | Product | Barkodlu arama |
| `/expenses/summary` | Expense | Gelir/Gider özet |
| `/gift-vouchers/new` | Gift Voucher | Çek oluşturma |
| `/inventory/bulk-adjust` | Inventory | Toplu stok düzeltme |
| `/finance/bank-accounts/[id]` | Partner Finance | Hesap detay + hareketler |
| `/finance/operations/upcoming` | Partner Finance | Yaklaşan çek/senet |
| Bildirim sayfası + header badge | Notification | Bildirimler |

### Sprint 4 — Tamamlayıcı

| Sayfa | Modül | Açıklama |
|-------|-------|-----------|
| `/label-templates` | Label | Şablon CRUD |
| `/integrations` | Integration | E-ticaret yönetimi |
| `/staff-performance` | Staff | Lider tablosu + hedefler |
| WebSocket real-time entegrasyonu | Events | Stok/sipariş anlık güncellemeler |
| API v2 client hazırlığı | Core | v2 endpoint'leri için client altyapısı |

---

## Genel Tespitler

### 1. Form State Management
Birçok "yeni oluşturma" sayfasında (new sayfalar) form state'i eksik veya yetersiz. Tüm new/edit/delete akışları için:
- `react-hook-form` + `zod` validation
- Loading / error / success durumları
- Toast notification

### 2. API Response Handling (GlobalResponseInterceptor)
Backend tüm yanıtları `{ data, meta }` ile sarıyor. Tüm sayfalarda `res.data.data` kullanılmalı (düz listeler için `res.data?.data ?? res.data`). Bu rapor hazırlanmadan önce 7 sayfada düzeltme yapıldı.

### 3. WebSocket Entegrasyonu
Backend'de WebSocket gateway mevcut (`/ws`). Frontend'de `socket.io-client` bağımlılığı yok ve hiçbir real-time event listener'ı yok. Bu büyük bir eksik.

### 4. Export/Print İşlevleri
Excel ve PDF export endpoint'leri backend'de mevcut (`/reports/*/excel`, `/reports/*/pdf`, `/customers/:id/statement/export/*`) ama frontend'de:
- Hiçbir rapor sayfasında export butonu yok
- Fiş yazdırma akışı yok

### 5. Auth Interceptor ve 401 Handling
`api.ts` içinde 401 yakalama ve `/login`'e yönlendirme mevcut. Ancak tüm API çağrılarının bu interceptor'a uğradığından emin olunmalı.

---

*Bu rapor frontend güncelleme sprint'leri için referans dokümandır. Sprint öncelikleri iş değerine ve bağımlılıklara göre değiştirilebilir.*
