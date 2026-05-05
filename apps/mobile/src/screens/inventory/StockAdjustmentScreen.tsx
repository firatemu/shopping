import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';
import type { AppStackParamList } from '../../types/navigation';
import type { BarcodeLookupResponse } from '../../types/product';
import type { StockAdjustmentReason } from '../../types/inventory';

type Route = RouteProp<AppStackParamList, 'StockAdjustment'>;
type Nav = NativeStackNavigationProp<AppStackParamList>;

const REASONS: Array<{ label: string; value: StockAdjustmentReason }> = [
  { label: 'Sayım', value: 'MANUAL_COUNT' },
  { label: 'Hasar', value: 'DAMAGE' },
  { label: 'Kayıp / hırsızlık', value: 'THEFT' },
  { label: 'İade (tedarikçi)', value: 'RETURN_TO_SUPPLIER' },
  { label: 'Yeni sevkiyat', value: 'NEW_SHIPMENT' },
  { label: 'Düzeltme', value: 'CORRECTION' },
];

export function StockAdjustmentScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';
  const canAdjust = ['STORE_MANAGER', 'TENANT_ADMIN', 'SUPER_ADMIN'].includes(role);

  const [barcode, setBarcode] = useState('');
  const [variantId, setVariantId] = useState(params?.variantId ?? '');
  const [newQty, setNewQty] = useState('');
  const [reasonEnum, setReasonEnum] = useState<StockAdjustmentReason>('MANUAL_COUNT');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lookupName, setLookupName] = useState<string | null>(null);

  const lookup = async () => {
    const b = barcode.trim();
    if (!b) return;
    setErr(null);
    try {
      const res = await api.post<BarcodeLookupResponse>('/products/barcodes/lookup', { barcode: b });
      setVariantId(res.data.id);
      setLookupName(`${res.data.product.name} · ${res.data.color}/${res.data.size}`);
    } catch (e) {
      setLookupName(null);
      setErr(getApiErrorMessage(e, 'Ürün bulunamadı'));
    }
  };

  const submit = async () => {
    const qty = Number.parseInt(newQty, 10);
    if (!variantId) {
      setErr('Varyasyon seçin veya barkod okutun');
      return;
    }
    if (!Number.isFinite(qty) || qty < 0) {
      setErr('Geçerli stok miktarı girin');
      return;
    }
    if (!note.trim()) {
      setErr('Açıklama zorunludur');
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      await api.patch('/inventory/bulk-adjust', {
        items: [{ newQuantity: qty, reason: note.trim(), variantId }],
        reason: reasonEnum,
      });
      navigation.goBack();
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (!canAdjust) {
    return (
      <ScreenState
        tone="error"
        title="Yetki yok"
        description="Stok düzeltme yalnızca mağaza müdürü ve üstü roller ile yapılabilir."
      />
    );
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Stok düzeltme</Text>
      <Text style={styles.label}>Barkod ile bul</Text>
      <View style={styles.row}>
        <TextInput
          onChangeText={setBarcode}
          placeholder="Barkod"
          style={[styles.input, { flex: 1 }]}
          value={barcode}
        />
        <Pressable onPress={() => void lookup()} style={styles.lookupBtn}>
          <Text style={styles.lookupBtnText}>Bul</Text>
        </Pressable>
      </View>
      {lookupName ? <Text style={styles.ok}>{lookupName}</Text> : null}

      <Text style={styles.label}>Varyasyon ID (UUID)</Text>
      <TextInput
        onChangeText={setVariantId}
        placeholder="Opsiyonel — barkod bulunca dolar"
        style={styles.input}
        value={variantId}
      />

      <Text style={styles.label}>Yeni stok</Text>
      <TextInput
        keyboardType="number-pad"
        onChangeText={setNewQty}
        style={styles.input}
        value={newQty}
      />

      <Text style={styles.label}>Sebep türü</Text>
      <View style={styles.chips}>
        {REASONS.map((r) => (
          <Pressable
            key={r.value}
            onPress={() => setReasonEnum(r.value)}
            style={[styles.chip, reasonEnum === r.value && styles.chipOn]}
          >
            <Text style={styles.chipText}>{r.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Açıklama (audit / zorunlu)</Text>
      <TextInput
        multiline
        onChangeText={setNote}
        style={[styles.input, { height: 100, paddingTop: 12, textAlignVertical: 'top' }]}
        value={note}
      />

      {err ? <Text style={styles.err}>{err}</Text> : null}

      <Pressable disabled={loading} onPress={() => void submit()} style={styles.btn}>
        <Text style={styles.btnText}>{loading ? 'Kaydediliyor…' : 'Kaydet'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    marginTop: 16,
  },
  btnText: { color: '#fff', fontWeight: '900' },
  chip: {
    borderColor: '#cbd5e1',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipOn: { backgroundColor: '#eef2ff', borderColor: '#4f46e5' },
  chipText: { fontSize: 12, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  content: { padding: 16 },
  err: { color: '#dc2626', marginTop: 8 },
  input: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  label: { color: '#64748b', fontWeight: '700', marginBottom: 4 },
  lookupBtn: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  lookupBtnText: { color: '#fff', fontWeight: '800' },
  ok: { color: '#16a34a', fontWeight: '700', marginBottom: 8 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 12 },
  wrap: { backgroundColor: '#f8fafc', flex: 1 },
});
