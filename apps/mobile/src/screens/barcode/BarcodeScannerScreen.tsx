import { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { RouteProp, useIsFocused, useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, getApiErrorMessage } from '../../lib/api';
import { formatCurrency } from '../../lib/money';
import { useCartStore } from '../../stores/cart.store';
import type { AppStackParamList } from '../../types/navigation';
import type { BarcodeLookupResponse } from '../../types/product';

type Route = RouteProp<AppStackParamList, 'BarcodeScanner'>;
type Navigation = NativeStackNavigationProp<AppStackParamList>;

export function BarcodeScannerScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Navigation>();
  const isFocused = useIsFocused();
  const addItem = useCartStore((state) => state.addItem);
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [found, setFound] = useState<BarcodeLookupResponse | null>(null);
  const mode = route.params?.mode ?? 'lookup';

  const addLookupToCart = useCallback((row: BarcodeLookupResponse) => {
    addItem({
      barcode: row.barcode,
      brand: row.product.brand,
      category: row.product.category,
      kdvRate: row.product.kdvRate ?? 0,
      name: `${row.product.name} - ${row.color ?? ''}/${row.size ?? ''}`,
      price: row.salePrice ?? row.product.salePrice,
      productId: row.product.id,
      stockQuantity: row.stockQuantity - (row.reservedQty ?? 0),
      variantId: row.id,
    });
  }, [addItem]);

  const lookupBarcode = useCallback(async (barcode: string) => {
    if (mode === 'inventory') {
      setLocked(true);
      navigation.dispatch(
        CommonActions.navigate({
          name: 'Tabs',
          params: { screen: 'Inventory', params: { initialBarcode: barcode } },
        }),
      );
      navigation.goBack();
      return;
    }

    setLocked(true);
    setMessage(null);
    setFound(null);
    try {
      const response = await api.post<BarcodeLookupResponse>('/products/barcodes/lookup', { barcode });
      if (mode === 'cart') {
        addLookupToCart(response.data);
        navigation.goBack();
        return;
      }
      setFound(response.data);
      setMessage('Ürün bulundu');
    } catch (error) {
      setMessage(getApiErrorMessage(error, 'Ürün bulunamadı'));
      setTimeout(() => {
        setMessage(null);
        setLocked(false);
      }, 1200);
      return;
    }
    setLocked(false);
  }, [addLookupToCart, mode, navigation]);

  const handleScanned = (result: BarcodeScanningResult) => {
    if (locked) return;
    const barcode = result.data.trim();
    if (!barcode) return;
    void lookupBarcode(barcode);
  };

  if (!permission) {
    return <View style={styles.center}><Text>Kamera izni kontrol ediliyor...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Kamera izni gerekli</Text>
        <Text style={styles.description}>Barkod okutmak için kamera erişimine izin verin.</Text>
        {permission.canAskAgain ? (
          <Pressable onPress={() => void requestPermission()} style={styles.primaryButton}>
            <Text style={styles.primaryText}>İzin iste</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => void Linking.openSettings()} style={styles.primaryButton}>
            <Text style={styles.primaryText}>Ayarları aç</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        active={isFocused}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'] }}
        enableTorch={torch}
        facing="back"
        onBarcodeScanned={locked ? undefined : handleScanned}
        style={styles.camera}
      >
        <View style={styles.overlay}>
          <Text style={styles.scanTitle}>Barkodu çerçeve içine alın</Text>
          <View style={styles.scanBox} />
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Pressable onPress={() => setTorch((value) => !value)} style={styles.torchButton}>
            <Text style={styles.primaryText}>{torch ? 'Flaşı kapat' : 'Flaşı aç'}</Text>
          </Pressable>
        </View>
      </CameraView>

      {found ? (
        <View style={styles.result}>
          <Text style={styles.title}>{found.product.name}</Text>
          <Text style={styles.description}>{found.barcode} · Stok {found.stockQuantity - (found.reservedQty ?? 0)}</Text>
          <Text style={styles.price}>{formatCurrency(found.salePrice ?? found.product.salePrice)}</Text>
          <View style={styles.actions}>
            <Pressable onPress={() => { addLookupToCart(found); navigation.goBack(); }} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Sepete ekle</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('ProductDetail', { productId: found.product.id })} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Detaya git</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  camera: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#000000',
    flex: 1,
  },
  description: {
    color: '#64748b',
    textAlign: 'center',
  },
  message: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 12,
    color: '#ffffff',
    fontWeight: '800',
    marginTop: 16,
    overflow: 'hidden',
    padding: 12,
  },
  overlay: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  price: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    flex: 1,
    height: 46,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  result: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 6,
    padding: 20,
  },
  scanBox: {
    borderColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 3,
    height: 180,
    width: 280,
  },
  scanTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 24,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#4f46e5',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    height: 46,
    justifyContent: 'center',
  },
  secondaryText: {
    color: '#4f46e5',
    fontWeight: '900',
  },
  title: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  torchButton: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
  },
});
