# TextilePOS Mobile — Mobil Agent Kuralları

> Bu dosya `AGENTS.md` ana dökümanının React Native / Expo katmanına özel ek kurallarını içerir.
> Cursor bu klasörde çalışırken bu kuralları otomatik yükler.

## Bu Klasörde Çalışırken

Yusuf (Mobile) rolü birincil aktiftir.
Ece (Frontend) ile paylaşılan logic'te koordinasyon gerekir.
Kaan (Security) token ve offline veri güvenliğini denetler.

---

## ⚠️ KRİTİK UYARLAR

- Expo SDK sürümünü her zaman `package.json`'dan kontrol et
- iOS ve Android arasındaki platform farklarını her zaman değerlendir
- AsyncStorage KULLANMA — token için MMKV zorunlu
- OTA update uyumluluğunu kırmayan değişiklikler yap

---

## Klasör Yapısı

```
src/
  screens/              ← Ekranlar (her route = bir ekran)
    pos/                ← Satış konsolu ekranları
    products/           ← Ürün yönetimi
    stock/              ← Stok işlemleri
    reports/            ← Raporlama
    settings/           ← Ayarlar
  components/           ← Paylaşılan bileşenler
  navigation/           ← React Navigation config
  hooks/                ← Custom hooks
  lib/
    api.ts              ← API client (web ile aynı pattern)
    storage.ts          ← MMKV wrapper
    formatters.ts       ← Para, tarih formatları
    printer.ts          ← BLE yazıcı yardımcıları
  stores/               ← Zustand store'ları
  types/                ← Tip tanımları
```

---

## Token Yönetimi — MMKV Zorunlu

```typescript
// ✅ DOĞRU — MMKV kullan
import { storage } from '@/lib/storage';  // MMKV wrapper

storage.set('accessToken', token);
const token = storage.getString('accessToken');
storage.delete('accessToken');

// ❌ YANLIŞ — AsyncStorage yavaş ve güvensiz
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('token', token);
```

---

## Barkod Okuma — < 50ms Hedef

```typescript
// Expo Camera veya Vision Camera kullan
import { CameraView } from 'expo-camera';

// Barkod scan handler — debounce ile çift okumayı önle
const [lastScanned, setLastScanned] = useState<string | null>(null);

const handleBarcodeScanned = useCallback(({ data }: BarcodeScanningResult) => {
  if (data === lastScanned) return;  // Çift okuma engeli
  setLastScanned(data);
  onScan(data);
  setTimeout(() => setLastScanned(null), 1500);
}, [lastScanned, onScan]);
```

---

## BLE Yazıcı — ESC/POS

```typescript
// Desteklenen: Star Micronics / Epson TM serisi
// Fiş şablonu NestJS'ten gelir — mobil sadece yazdırır

import { printReceipt } from '@/lib/printer';

const receiptData = await api.getReceiptData(orderId);  // NestJS'ten şablon al
await printReceipt(receiptData, selectedPrinter);        // BLE ile gönder
```

---

## Platform Farkları

```typescript
import { Platform } from 'react-native';

// iOS'ta kamera izni farklı çalışır
if (Platform.OS === 'ios') {
  // Fotoğraf Kitaplığı izni ayrı istenebilir
}

// Android back button
useEffect(() => {
  if (Platform.OS !== 'android') return;
  const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
    // POS ekranında geri tuşu satış iptali sorusu gösterir
    return true; // Varsayılan davranışı engelle
  });
  return () => backHandler.remove();
}, []);
```

---

## Offline-First Kuralları

```typescript
// Kritik veriler lokal cache'lenmeli:
// - Ürün kataloğu (barkod lookup için)
// - Fiyat listesi
// - Aktif kampanyalar

// Network durumu kontrolü
import NetInfo from '@react-native-community/netinfo';

const { isConnected } = useNetInfo();

if (!isConnected) {
  // Offline modda sadece cache'lenmiş barkod ile satış
  // Sync kuyruğuna ekle — bağlantı gelince gönder
}
```

---

## Zorunlu UI State'leri

```tsx
// Web ile aynı kural: 4 durum mutlaka implement et
// Loading / Empty / Error / Success

function ProductScreen() {
  const { data, isLoading, isError } = useQuery(...)

  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorView onRetry={refetch} />
  if (!data?.length) return <EmptyView message="Ürün bulunamadı" />
  return <ProductList data={data} />
}
```

---

## Build Doğrulaması

```bash
# Expo check
cd apps/mobile
npx expo-doctor

# TypeScript kontrolü
npx tsc --noEmit

# EAS build (staging)
eas build --platform all --profile staging
```
