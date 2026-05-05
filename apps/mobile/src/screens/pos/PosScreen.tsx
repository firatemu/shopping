import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenState } from '../../components/ScreenState';
import { formatCurrencyFromCents } from '../../lib/money';
import { useCartStore, type CartItem } from '../../stores/cart.store';
import type { AppStackParamList } from '../../types/navigation';

type Navigation = NativeStackNavigationProp<AppStackParamList>;

function CartRow({ item }: { item: CartItem }) {
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  const rightActions = () => (
    <Pressable onPress={() => removeItem(item.variantId)} style={styles.deleteAction}>
      <Text style={styles.deleteText}>Sil</Text>
    </Pressable>
  );

  return (
    <Swipeable renderRightActions={rightActions}>
      <View style={styles.cartRow}>
        <View style={styles.cartInfo}>
          <Text numberOfLines={1} style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemMeta}>{item.barcode} · {formatCurrencyFromCents(item.priceCents)}</Text>
          {item.campaignName ? (
            <Text style={styles.campaign}>Kampanya uygulandı: {item.campaignName} (-{formatCurrencyFromCents(item.discountCents)})</Text>
          ) : null}
        </View>
        <View style={styles.qtyBox}>
          <Pressable onPress={() => updateQuantity(item.variantId, item.quantity - 1)} style={styles.qtyButton}>
            <Text style={styles.qtyText}>-</Text>
          </Pressable>
          <Text style={styles.quantity}>{item.quantity}</Text>
          <Pressable onPress={() => updateQuantity(item.variantId, item.quantity + 1)} style={styles.qtyButton}>
            <Text style={styles.qtyText}>+</Text>
          </Pressable>
        </View>
      </View>
    </Swipeable>
  );
}

export function PosScreen() {
  const navigation = useNavigation<Navigation>();
  const [barcode, setBarcode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const items = useCartStore((state) => state.items);
  const addItemFromBarcode = useCartStore((state) => state.addItemFromBarcode);
  const selectedCustomerName = useCartStore((state) => state.selectedCustomerName);
  const clearCart = useCartStore((state) => state.clearCart);
  const totalCents = useCartStore((state) => state.totalCents);
  const subtotalCents = useCartStore((state) => state.subtotalCents);
  const discountTotalCents = useCartStore((state) => state.discountTotalCents);
  const taxTotalCents = useCartStore((state) => state.taxTotalCents);
  const campaignLoading = useCartStore((state) => state.campaignLoading);
  const campaignMessage = useCartStore((state) => state.campaignMessage);

  const submitBarcode = async () => {
    const value = barcode.trim();
    if (!value) return;
    const result = await addItemFromBarcode(value);
    setMessage(result.success ? 'Ürün sepete eklendi' : (result.error ?? 'Ürün bulunamadı'));
    setBarcode('');
    setTimeout(() => setMessage(null), 1400);
  };

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <View style={styles.searchRow}>
          <TextInput
            onChangeText={setBarcode}
            onSubmitEditing={() => void submitBarcode()}
            placeholder="Barkod veya ürün kodu..."
            returnKeyType="done"
            style={styles.input}
            value={barcode}
          />
          <Pressable onPress={() => navigation.navigate('BarcodeScanner', { mode: 'cart' })} style={styles.scanButton}>
            <Text style={styles.scanText}>Tara</Text>
          </Pressable>
        </View>
        <View style={styles.actionRow}>
          <Pressable onPress={() => navigation.navigate('CustomerSelect')} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>{selectedCustomerName ?? 'Müşteri Seç'}</Text>
          </Pressable>
          <Pressable onPress={clearCart} style={styles.clearButton}>
            <Text style={styles.clearText}>Temizle</Text>
          </Pressable>
        </View>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {campaignLoading ? <Text style={styles.message}>Kampanya hesaplanıyor...</Text> : null}
        {campaignMessage ? <Text style={styles.message}>{campaignMessage}</Text> : null}
      </View>

      {items.length === 0 ? (
        <ScreenState title="Sepet boş" description="Barkod okutarak veya ürünlerden seçim yaparak sepete ürün ekleyin." />
      ) : (
        <FlatList data={items} keyExtractor={(item) => item.variantId} renderItem={({ item }) => <CartRow item={item} />} />
      )}

      <View style={styles.summary}>
        <View style={styles.summaryLine}><Text>Ara toplam</Text><Text>{formatCurrencyFromCents(subtotalCents)}</Text></View>
        <View style={styles.summaryLine}><Text>İndirim</Text><Text>-{formatCurrencyFromCents(discountTotalCents)}</Text></View>
        <View style={styles.summaryLine}><Text>KDV</Text><Text>{formatCurrencyFromCents(taxTotalCents)}</Text></View>
        <View style={styles.totalLine}><Text style={styles.totalLabel}>Toplam</Text><Text style={styles.totalValue}>{formatCurrencyFromCents(totalCents)}</Text></View>
        <Pressable
          disabled={items.length === 0}
          onPress={() => navigation.navigate('Payment')}
          style={[styles.payButton, items.length === 0 && styles.disabled]}
        >
          <Text style={styles.payText}>Ödeme Al</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  campaign: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: '700',
  },
  cartInfo: {
    flex: 1,
    gap: 4,
  },
  cartRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
  },
  clearButton: {
    alignItems: 'center',
    borderColor: '#dc2626',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    height: 42,
    justifyContent: 'center',
  },
  clearText: {
    color: '#dc2626',
    fontWeight: '800',
  },
  container: {
    backgroundColor: '#f8fafc',
    flex: 1,
  },
  deleteAction: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    marginVertical: 6,
    width: 82,
  },
  deleteText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.5,
  },
  input: {
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
  },
  itemMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  itemName: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '900',
  },
  message: {
    color: '#4f46e5',
    fontWeight: '700',
  },
  payButton: {
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    marginTop: 10,
  },
  payText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  qtyBox: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  qtyButton: {
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  qtyText: {
    color: '#4f46e5',
    fontSize: 18,
    fontWeight: '900',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '900',
    minWidth: 24,
    textAlign: 'center',
  },
  scanButton: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 72,
  },
  scanText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    flex: 2,
    height: 42,
    justifyContent: 'center',
  },
  secondaryText: {
    color: '#0f172a',
    fontWeight: '800',
  },
  summary: {
    backgroundColor: '#ffffff',
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
    gap: 6,
    padding: 16,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  top: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    gap: 10,
    padding: 16,
  },
  totalLabel: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  totalValue: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },
});
