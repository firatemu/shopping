# Makbuz Yazdırma Sistemi - Teknik Döküman

Bu döküman, OtoMuhasebe sistemindeki makbuz yazdırma özelliğinin nasıl oluşturulduğunu, kullanılan teknolojileri ve tüm özellikleri detaylı olarak açıklamaktadır.

## İçindekiler

1. [Teknoloji Stack](#teknoloji-stack)
2. [Dosya Yapısı](#dosya-yapısı)
3. [Temel Özellikler](#temel-özellikler)
4. [Kod Yapısı ve Açıklamalar](#kod-yapısı-ve-açıklamalar)
5. [Kağıt Boyutları ve Orientasyon](#kağıt-boyutları-ve-orientasyon)
6. [Yazdırma Mekanizması](#yazdırma-mekanizması)
7. [PDF Dışa Aktarma](#pdf-dışa-aktarma)
8. [Zoom/P Yakınlaştırma Özelliği](#zoom-yakınlaştırma-özelliği)
9. [API Entegrasyonu](#api-entegrasyonu)
10. [Veri Dönüşümü](#veri-dönüşümü)
11. [MUI v7 Grid2 Kullanımı](#mui-v7-grid2-kullanımı)
12. [CSS Print Media Query](#css-print-media-query)
13. [Kurulum ve Bağımlılıklar](#kurulum-ve-bağımlılıklar)

---

## Teknoloji Stack

- **Framework**: Next.js 16 (App Router + Turbopack)
- **UI Kütüphanesi**: MUI v7 (`@mui/material`)
- **Print Engine**: `react-to-print` - Tarayıcı yazdırma API'si
- **PDF Oluşturma**: `html2canvas` + `jspdf`
- **Font**: Inter (Google Fonts)
- **State Management**: React useState/useRef

### Bağımlılıklar (package.json)

```json
{
  "@mui/material": "^7.3.9",
  "@mui/icons-material": "^7.x.x",
  "react-to-print": "^2.x.x",
  "html2canvas": "^1.4.x",
  "jspdf": "^2.x.x"
}
```

---

## Dosya Yapısı

```
src/app/(main)/collection/
├── print/
│   └── [id]/
│       └── page.tsx          # Ana makbuz yazdırma sayfası
├── page.tsx                  # Tahsilat listesi (yazdırma butonu burada)
└── types.ts                  # TypeScript interface'leri
```

### route.ts Proxy (API Rotası)

```typescript
// src/app/api/[...path]/route.ts
// Next.js API proxy - frontend'in backend'e erişimi için
```

---

## Temel Özellikler

### 1. Çoklu Kağıt Boyutu Desteği
- **A4** (210mm x 297mm)
- **A5 Dikey** (148mm x 210mm)
- **A5 Yatay** (210mm x 148mm)

### 2. Print ve PDF Export
- Tarayıcı yazdırma dialoğu (`react-to-print`)
- PDF olarak kaydetme (`html2canvas` + `jspdf`)

### 3. Zoom/P Yakınlaştırma
- 50% - 160% arası yakınlaştırma
- Canlı önizleme

### 4. Responsive Layout
- MUI v7 Grid2 ile responsive grid
- Kağıt boyutuna göre dinamik padding/font-size

---

## Kod Yapısı ve Açıklamalar

### 1. TypeScript Interface'leri

```typescript
// Makbuz veri yapısı
interface TahsilatDetail {
  id: string;
  tip: 'TAHSILAT' | 'ODEME';
  tutar: number;
  tarih: string;
  odemeTipi: 'NAKIT' | 'KREDI_KARTI' | string;
  aciklama?: string | null;
  createdAt?: string | null;
  cari: {
    cariKodu: string;
    unvan: string;
    adres?: string | null;
    telefon?: string | null;
    vergiNo?: string | null;
    vergiDairesi?: string | null;
  };
  kasa?: { kasaKodu: string; kasaAdi: string; kasaTipi: string } | null;
  fatura?: { faturaNo: string | null } | null;
  kalanBakiye?: number;
}

// Tenant/Cari firma bilgileri
interface TenantSettings {
  logoUrl?: string;
  companyName?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxNo?: string;
  taxOffice?: string;
  mersisNo?: string;
  tradeRegistryNo?: string;
  website?: string;
}

interface Tenant {
  id: string;
  name: string;
  settings?: TenantSettings;
}

// Kağıt boyutu tipi
type PaperSize = 'A4' | 'A5' | 'A5-landscape';
```

### 2. Yardımcı Fonksiyonlar

```typescript
// Tarih formatlama (TR locale)
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Para formatlama (TL)
const formatMoney = (amount: number | string) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(Number(amount));

// Ödeme tipi çeviri
const formatOdemeTipi = (tip: string) => {
  const map: Record<string, string> = {
    NAKIT: 'Nakit',
    KREDI_KARTI: 'Kredi Kartı',
    BANKA_HAVALESI: 'Banka Havalesi',
    CEK: 'Çek',
    SENET: 'Senet',
  };
  return map[tip] || tip;
};

// Makbuz numarası (ID'nin ilk 8 karakteri)
function receiptNo(id: string) {
  return id.slice(0, 8).toUpperCase();
}
```

### 3. State ve Ref'ler

```typescript
export default function TahsilatPrintPage() {
  const params = useParams();
  const id = params.id as string;

  // Makbuz ve tenant verisi
  const [tahsilat, setTahsilat] = useState<TahsilatDetail | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  // UI state'leri
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [paperSize, setPaperSize] = useState<PaperSize>('A5');
  const [zoom, setZoom] = useState(100);

  // Print için referans
  const printRef = useRef<HTMLDivElement>(null);
}
```

---

## Kağıt Boyutları ve Orientasyon

### Dinamik Boyut Hesaplama

```typescript
const isLandscape = paperSize === 'A5-landscape';

// Kağıt genişliği
const width = paperSize === 'A4' ? '210mm'
            : paperSize === 'A5' ? '148mm'
            : '210mm'; // A5-landscape

// Kağıt yüksekliği
const height = paperSize === 'A4' ? '297mm'
             : paperSize === 'A5' ? '210mm'
             : '148mm'; // A5-landscape

// Font boyutu (kağıt boyutuna göre)
const fontSize = paperSize === 'A4' ? '10pt'
              : isLandscape ? '8.5pt'
              : '9pt';
```

### CSS @media print Boyutları

```typescript
<style jsx global>{`
  @media print {
    body { margin: 0; padding: 0; }
    @page {
      size: ${paperSize === 'A4' ? 'A4 portrait'
            : paperSize === 'A5' ? 'A5 portrait'
            : 'A5 landscape'};
      margin: 0;
    }
  }
`}</style>
```

### Kağıt Seçimi UI

```typescript
<ButtonGroup size="small">
  <Button
    variant={paperSize === 'A4' ? 'contained' : 'outlined'}
    onClick={() => setPaperSize('A4')}
  >
    A4
  </Button>
  <Button
    variant={paperSize === 'A5' ? 'contained' : 'outlined'}
    onClick={() => setPaperSize('A5')}
  >
    A5 ⬍
  </Button>
  <Button
    variant={paperSize === 'A5-landscape' ? 'contained' : 'outlined'}
    onClick={() => setPaperSize('A5-landscape')}
  >
    A5 ⬌
  </Button>
</ButtonGroup>
```

---

## Yazdırma Mekanizması

### react-to-print Kullanımı

```typescript
import { useReactToPrint } from 'react-to-print';

const handlePrint = useReactToPrint({
  contentRef: printRef,           // Yazdırılacak element referansı
  documentTitle: tahsilat ? `Makbuz-${receiptNo(tahsilat.id)}` : 'Tahsilat-Makbuzu',
});
```

### Print Tuşu

```typescript
<Button
  variant="contained"
  startIcon={<Print />}
  onClick={handlePrint}
  sx={{ bgcolor: '#0f172a', '&:hover': { bgcolor: '#1e293b' } }}
>
  Yazdır
</Button>
```

### Print Ref Kullanımı

```typescript
<Box ref={printRef} sx={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
  <ReceiptTemplate
    tahsilat={tahsilat}
    tenant={tenant}
    paperSize={paperSize}
    formatDate={formatDate}
    formatMoney={formatMoney}
  />
</Box>
```

---

## PDF Dışa Aktarma

### html2canvas + jsPDF Kullanımı

```typescript
const handleDownloadPDF = async () => {
  if (!printRef.current || !tahsilat) return;

  try {
    setExportLoading(true);

    // 1. HTML'i canvas'a çevir
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const element = printRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,                    // Çözünürlük (Retina için 2x)
      useCORS: true,               // Cross-origin resimler için
      logging: false,               // Console log yok
      backgroundColor: '#ffffff',   // Beyaz arka plan
    });

    // 2. Canvas'ı PDF'e çevir
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: paperSize === 'A5-landscape' ? 'landscape' : 'portrait',
      unit: 'mm',
      format: paperSize === 'A4' ? 'a4' : 'a5',
      compress: true,               // PDF sıkıştırma
    });

    // 3. PDF'e görseli ekle (tam sayfa)
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

    // 4. İndir
    pdf.save(`Makbuz-${receiptNo(tahsilat.id)}.pdf`);
  } catch (error) {
    console.error('PDF oluşturulamadı:', error);
    enqueueSnackbar('PDF oluşturulurken bir hata oluştu', { variant: 'error' });
  } finally {
    setExportLoading(false);
  }
};
```

### PDF Tuşu

```typescript
<Button
  variant="outlined"
  startIcon={<PictureAsPdf />}
  onClick={handleDownloadPDF}
  disabled={exportLoading}
>
  {exportLoading ? 'İşleniyor...' : 'PDF İndir'}
</Button>
```

---

## Zoom/Yakınlaştırma Özelliği

### Zoom Kontrolleri

```typescript
<Stack direction="row" spacing={1} alignItems="center">
  <Tooltip title="Yakınlaştır">
    <IconButton size="small" onClick={() => setZoom((z) => Math.min(z + 10, 160))}>
      <ZoomIn />
    </IconButton>
  </Tooltip>
  <Typography variant="body2">{zoom}%</Typography>
  <Tooltip title="Uzaklaştır">
    <IconButton size="small" onClick={() => setZoom((z) => Math.max(z - 10, 50))}>
      <ZoomOut />
    </IconButton>
  </Tooltip>
</Stack>
```

### Zoom Uygulama

```typescript
<Box
  ref={printRef}
  sx={{
    transform: `scale(${zoom / 100})`,
    transformOrigin: 'top center',
    transition: 'transform 0.2s ease',
  }}
>
  {/* Makbuz içeriği */}
</Box>
```

**Not**: Zoom, sadece ekranda görsel yakınlaştırma yapar. Print/PDF çıktısı orijinal kağıt boyutunda olur.

---

## API Entegrasyonu

### Veri Çekme

```typescript
useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const [tahsilatRes, tenantRes] = await Promise.all([
        axios.get(`/collections/${id}`),
        axios.get('/tenants/current'),
      ]);

      // Veri dönüşümü (bkz. Veri Dönüşümü bölümü)
      transformApiData(tahsilatRes);

      setTahsilat(tahsilatRes.data);
      setTenant(tenantRes.data);
    } catch (error) {
      console.error('Veri alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  if (id) {
    void fetchData();
  }
}, [id]);
```

### API Proxy (Next.js Route Handler)

```typescript
// src/app/api/[...path]/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

async function proxyRequest(req: NextRequest, pathSegments: string[]) {
  const pathname = '/api/' + pathSegments.join('/');
  const target = new URL(pathname + req.nextUrl.search, resolveBackendBase());

  const backendRes = await fetch(target.toString(), {
    method: req.method,
    headers: forwardRequestHeaders(req),
    body: await req.arrayBuffer(),
    cache: 'no-store',
    signal: AbortSignal.timeout(120_000),
  });

  return new NextResponse(backendRes.body, {
    status: backendRes.status,
    headers: buildProxyResponseHeaders(backendRes.headers),
  });
}
```

---

## Veri Dönüşümü

Backend API farklı alan isimleri dönebilir. Frontend'in beklediği format ile API'nin döndüğü format arasında dönüşüm yapılmalıdır.

### Örnek: Account -> Cari Dönüşümü

```typescript
// API'den gelen veri (account)
// { code: "C0001", title: "FIRAT", address: "...", taxNumber: "..." }

// Frontend'in beklediği (cari)
// { cariKodu: "C0001", unvan: "FIRAT", adres: "...", vergiNo: "..." }

if (tahsilatRes.data.account && !tahsilatRes.data.cari) {
  const account = tahsilatRes.data.account;
  tahsilatRes.data.cari = {
    cariKodu: account.code || '',
    unvan: account.title || account.fullName || '',
    adres: account.address || null,
    telefon: account.phone || null,
    vergiNo: account.taxNumber || null,
    vergiDairesi: account.taxOffice || null,
  };
}
```

---

## MUI v7 Grid2 Kullanımı

MUI v7'de `Grid` yerine `Grid2` kullanılır ve `size` prop'u farklıdır.

### Import

```typescript
import { Grid2 as Grid } from '@mui/material';
```

### Grid2 Syntax (MUI v7)

```typescript
// Eski (MUI v5/v6)
<Grid container spacing={2}>
  <Grid item xs={6}>

// Yeni (MUI v7)
<Grid container spacing={2}>
  <Grid size={{ xs: 6 }}>
```

### Responsive Size

```typescript
// xs, sm, md, lg, xl breakpoints
<Grid size={{ xs: 12, sm: 6, md: 4 }}>
```

### Örnek: İki Sütunlu Grid

```typescript
<Grid container spacing={3}>
  {/* Sol Sütun - Cari Bilgisi */}
  <Grid size={{ xs: 12, md: 6 }}>
    <Box sx={{ p: 2, border: '1px solid', borderRadius: 2 }}>
      {/* Cari içeriği */}
    </Box>
  </Grid>

  {/* Sağ Sütun - Ödeme Bilgisi */}
  <Grid size={{ xs: 12, md: 6 }}>
    <Box sx={{ p: 2, border: '1px solid', borderRadius: 2 }}>
      {/* Ödeme içeriği */}
    </Box>
  </Grid>
</Grid>
```

### Kağıt Boyutuna Göre Dinamik Spacing

```typescript
<Grid container spacing={isLandscape ? 2 : 3}>
```

---

## CSS Print Media Query

Makbuz yazdırıldığında sadece makbuz kısmının çıkması için `@media print` kullanılır.

### Global Print Styles

```typescript
<style jsx global>{`
  @media print {
    body {
      margin: 0;
      padding: 0;
    }
  }
`}</style>
```

### Paper Component Print Override

```typescript
<Paper
  sx={{
    // Ekranda görünüm
    boxShadow: 4,

    // Print'te gölge yok
    '@media print': {
      boxShadow: 'none',
    },
  }}
>
```

### @page Kuralı

```typescript
<style jsx global>{`
  @media print {
    @page {
      size: A4 portrait;  // veya A5 portrait, A5 landscape
      margin: 0;
    }
  }
`}</style>
```

---

## Layout Bileşenleri

### Header (Başlık Alanı)

```typescript
<Box sx={{
  bgcolor: '#f8fafc',        // Slate 50
  p: isLandscape ? 2 : 3,
  borderBottom: '1px solid #e2e8f0', // Slate 200
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}}>
  {/* Sol: Logo + Firma Bilgisi */}
  <Stack direction="row" spacing={2} alignItems="center">
    {/* Logo */}
    {logoUrl ? (
      <img src={logoUrl} alt="Logo" style={{ height: 50 }} />
    ) : (
      <Box sx={{
        width: 50, height: 50,
        bgcolor: '#0f172a',    // Slate 900
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 1
      }}>
        {tenant?.name?.substring(0, 2).toUpperCase() || 'OM'}
      </Box>
    )}
    {/* Firma Adı ve Adres */}
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {tenant?.settings?.companyName || tenant?.name}
      </Typography>
      <Typography variant="caption">
        {tenant?.settings?.address}
      </Typography>
    </Box>
  </Stack>

  {/* Sağ: Makbuz Başlığı */}
  <Box sx={{ textAlign: 'right' }}>
    <Typography variant="h5" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
      {tahsilat.tip === 'TAHSILAT' ? 'TAHSİLAT MAKBUZU' : 'ÖDEME MAKBUZU'}
    </Typography>
    <Stack direction="row" spacing={1}>
      <Typography variant="caption">No: <strong>{makbuzNo}</strong></Typography>
      <Typography variant="caption">|</Typography>
      <Typography variant="caption">Tarih: <strong>{formatDate(tahsilat.tarih)}</strong></Typography>
    </Stack>
  </Box>
</Box>
```

### Cari/Ödeme Grid

```typescript
<Grid container spacing={3}>
  {/* Cari Bilgisi */}
  <Grid size={{ xs: 12, md: 6 }}>
    <Box sx={{
      p: 2,
      border: '1px solid #e2e8f0',
      borderRadius: 2,
      position: 'relative',      // ::before pseudo-element için
      '&::before': {            // "SAYIN" etiketi
        content: '"SAYIN"',
        position: 'absolute',
        top: -10,
        left: 12,
        bgcolor: 'white',
        px: 1,
        fontSize: '0.65rem',
        fontWeight: 700,
        color: '#64748b'
      }
    }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {tahsilat.cari.unvan}
      </Typography>
      {tahsilat.cari.adres && (
        <Typography variant="body2">
          {tahsilat.cari.adres}
        </Typography>
      )}
      {tahsilat.cari.vergiNo && (
        <Typography variant="caption">
          VN: {tahsilat.cari.vergiNo} | VD: {tahsilat.cari.vergiDairesi}
        </Typography>
      )}
    </Box>
  </Grid>

  {/* Ödeme Bilgisi */}
  <Grid size={{ xs: 12, md: 6 }}>
    <Box sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#f8fafc' }}>
      <Stack spacing={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0' }}>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>ÖDEME ŞEKLİ</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>{formatOdemeTipi(tahsilat.odemeTipi)}</Typography>
        </Box>
        {/* Kasa, Fatura, Kalan Bakiye... */}
      </Stack>
    </Box>
  </Grid>
</Grid>
```

### Tutar Alanı

```typescript
<Grid container spacing={0} sx={{ border: '2px solid #0f172a', borderRadius: 2, overflow: 'hidden' }}>
  {/* Yalnız (Yazıyla Tutar) */}
  <Grid size={{ xs: 8 }} sx={{ p: 2, bgcolor: 'white' }}>
    <Typography variant="caption" sx={{ fontWeight: 700 }}>YALNIZ</Typography>
    <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
      # {amountInWords} #
    </Typography>
  </Grid>

  {/* Toplam Tutar */}
  <Grid size={{ xs: 4 }} sx={{ p: 2, bgcolor: 'white', textAlign: 'right' }}>
    <Typography variant="caption" sx={{ fontWeight: 600 }}>TOPLAM TUTAR</Typography>
    <Typography variant="h4" sx={{ fontWeight: 800 }}>
      {formatMoney(tahsilat.tutar)}
    </Typography>
  </Grid>
</Grid>
```

### İmza Alanı

```typescript
<Grid container spacing={4}>
  {/* Tahsil Eden / Ödeme Yapan */}
  <Grid size={{ xs: 6 }}>
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
        {tahsilat.tip === 'TAHSILAT' ? 'TAHSİL EDEN' : 'ÖDEME YAPAN'}
      </Typography>
      <Box sx={{ height: 50, borderBottom: '1px solid', width: '70%', mx: 'auto', opacity: 0.3 }} />
      <Typography variant="caption">İmza / Kaşe</Typography>
    </Box>
  </Grid>

  {/* Ödeme Yapan / Tahsil Eden */}
  <Grid size={{ xs: 6 }}>
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
        {tahsilat.tip === 'TAHSILAT' ? 'ÖDEME YAPAN' : 'TAHSİL EDEN'}
      </Typography>
      <Box sx={{ height: 50, borderBottom: '1px solid', width: '70%', mx: 'auto', opacity: 0.3 }} />
      <Typography variant="caption">İmza</Typography>
    </Box>
  </Grid>
</Grid>

{/* Footer */}
<Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
  <Typography variant="caption" sx={{ opacity: 0.6 }}>
    Bu belge dijital olarak <strong>OTOMUHASEBE</strong> üzerinden oluşturulmuştur.
  </Typography>
</Box>
```

---

## Kurulum ve Bağımlılıklar

### 1. Paketleri Yükleyin

```bash
npm install react-to-print html2canvas jspdf
# veya
pnpm add react-to-print html2canvas jspdf
```

### 2. MUI Grid2 Import

```typescript
import { Grid2 as Grid } from '@mui/material';
```

### 3. Temel Sayfa Yapısı

```typescript
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  ButtonGroup,
  Divider,
  IconButton,
  Tooltip,
  Grid2 as Grid,
} from '@mui/material';
import { Print, PictureAsPdf, ZoomIn, ZoomOut } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import axios from '@/lib/axios';

type PaperSize = 'A4' | 'A5' | 'A5-landscape';

export default function PrintPage() {
  const params = useParams();
  const [data, setData] = useState(null);
  const [paperSize, setPaperSize] = useState<PaperSize>('A5');
  const [zoom, setZoom] = useState(100);
  const printRef = useRef<HTMLDivElement>(null);

  // Veri çekme...
  // Veri dönüşümü...

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Makbuz-${data?.id}`,
  });

  const handleDownloadPDF = async () => {
    // PDF oluşturma...
  };

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', p: 3 }}>
      {/* Kontrol Paneli */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <ButtonGroup>
            <Button variant={paperSize === 'A4' ? 'contained' : 'outlined'} onClick={() => setPaperSize('A4')}>A4</Button>
            <Button variant={paperSize === 'A5' ? 'contained' : 'outlined'} onClick={() => setPaperSize('A5')}>A5 ⬍</Button>
            <Button variant={paperSize === 'A5-landscape' ? 'contained' : 'outlined'} onClick={() => setPaperSize('A5-landscape')}>A5 ⬌</Button>
          </ButtonGroup>
          <Stack direction="row" spacing={1}>
            <IconButton onClick={() => setZoom(z => Math.max(z - 10, 50))}><ZoomOut /></IconButton>
            <Typography>{zoom}%</Typography>
            <IconButton onClick={() => setZoom(z => Math.min(z + 10, 160))}><ZoomIn /></IconButton>
          </Stack>
          <Button startIcon={<Print />} onClick={handlePrint}>Yazdır</Button>
          <Button startIcon={<PictureAsPdf />} onClick={handleDownloadPDF}>PDF</Button>
        </Stack>
      </Paper>

      {/* Print Edilecek Alan */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        ref: printRef,
        sx: { transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }
      }}>
        <Paper sx={{ width: '148mm', height: '210mm', p: 3 }}>
          {/* Makbuz içeriği */}
        </Paper>
      </Box>

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          body { margin: 0; }
          @page { size: A5 portrait; margin: 0; }
        }
      `}</style>
    </Box>
  );
}
```

---

## Önemli İpuçları

### 1. Print Ref Her Zaman Doğru Element'e Verilmeli

```typescript
// Doğru - Ref, render edilen içeriğe verilmeli
<Box ref={printRef}>
  <ReceiptTemplate {...} />
</Box>

// Yanlış - Ref, component'in kendisine verilemez
<ReceiptTemplate ref={printRef} {...} />
```

### 2. CSS transform Zoom Print'i Etkilemez

Zoom sadece ekranda görsel yakınlaştırma yapar. Yazdırma çıktısı her zaman gerçek kağıt boyutundadır.

### 3. MM Birimleri Print İçin Kullanılmalı

```typescript
// Kağıt boyutları her zaman mm cinsinden
const width = '148mm';  // Doğru
const width = '148px';   // Yanlış
```

### 4. Landscape için A4/A5 Boyutları Değişir

```typescript
// A4 Portrait: 210 x 297 mm
// A5 Portrait: 148 x 210 mm

// A4 Landscape yok - A5 Landscape kullan
// A5 Landscape: 210 x 148 mm (genişlik x yükseklik)
```

### 5. CORS Görseller İçin useCORS: true

```typescript
const canvas = await html2canvas(element, {
  useCORS: true,  // CDN/harici görseller için gerekli
});
```

### 6. Print Önizleme İçin Transform Kullanımı

```typescript
<Box sx={{
  transform: `scale(${zoom / 100})`,
  transformOrigin: 'top center',
}}>
```

---

## Versiyon Geçmişi

| Versiyon | Tarih | Açıklama |
|----------|-------|-----------|
| 1.0 | 2026-05-08 | İlk versiyon - Temel makbuz yazdırma özellikleri |

---

Bu döküman, başka bir projede benzer bir makbuz/fatura yazdırma sistemi oluşturmak için ihtiyaç duyulan tüm teknik bilgileri içermektedir.
