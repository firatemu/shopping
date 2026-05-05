---
name: shadcn-ui-designer
description: TextilePOS kurumsal UI bileşenleri — shadcn/ui + Tailwind CSS ile responsive, dark-mode destekli tasarım
---

# shadcn/ui Designer — TextilePOS

## Amaç
TextilePOS'un tüm frontend sayfalarını shadcn/ui + Tailwind CSS ile kurumsal, tutarlı ve responsive olarak tasarlar.

## Tasarım Sistemi

### Renk Paleti
```css
:root {
  --primary: 222.2 47.4% 11.2%;        /* Koyu lacivert */
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  --destructive: 0 84.2% 60.2%;         /* Kırmızı */
  --success: 142 76% 36%;               /* Yeşil */
  --warning: 38 92% 50%;                /* Turuncu */
  --muted: 210 40% 96.1%;
  --border: 214.3 31.8% 91.4%;
  --radius: 0.5rem;
}
```

### Tipografi
- Başlıklar: `font-semibold text-lg` (Inter font)
- Body: `text-sm` (14px)
- Monospace: Para tutarları → `font-mono tabular-nums`

### Layout Kuralları
1. **Sidebar**: Sol tarafta 280px genişlik, collapsible
2. **Topbar**: Üstte 64px yükseklik, tenant adı + kullanıcı avatarı
3. **Content**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
4. **DataTable**: Tüm listeler `shadcn/ui DataTable` ile, pagination + filter

## Bileşen Standartları

### Form
```tsx
<Form>
  <FormField control={form.control} name="name"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Ürün Adı</FormLabel>
        <FormControl><Input {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

### Para Formatı
```typescript
// ZORUNLU: Intl.NumberFormat kullan
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
```

### DataTable
- Server-side pagination zorunlu
- Satır yüksekliği: 44px sabit
- Sıralama: tıklanabilir kolon başlıkları
- Filtre: search input + dropdown filtreler

### Dialog/Modal
- Genişlik: `sm:max-w-[425px]` (küçük), `sm:max-w-[600px]` (orta)
- Başlık + açıklama zorunlu
- Footer: Cancel (sol) + Submit (sağ)

## Responsive Kuralları
- Mobile-first yaklaşım
- `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)
- Sidebar mobilde gizli, hamburger menü
- DataTable mobilde horizontal scroll

## Modül Bazlı UI

| Modül | Ana Bileşen | Özel Gereksinim |
|-------|------------|-----------------|
| Ürün | DataTable + Form Dialog | Varyasyon grid, renk picker |
| Satış Konsolu | Full-screen layout | Barkod input (autofocus), sepet sidebar |
| Cari Hesap | DataTable + Detay sayfası | Ekstre tablosu, bakiye badge |
| Kasa | Card layout | Oturum durumu indicator |
| Raporlama | Chart + KPI cards | Recharts, tarih aralığı picker |
