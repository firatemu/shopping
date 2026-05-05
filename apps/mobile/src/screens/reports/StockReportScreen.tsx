import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import { formatCurrency } from '../../lib/money';

type StockOverview = {
  totalStockValue: string;
  byCategory: Array<{
    category: string;
    variantCount: number;
    totalQuantity: number;
    stockValue: string;
  }>;
  lowStock: Array<{
    variantId: string;
    productName: string;
    barcode: string;
    stockQuantity: number;
    minStockLevel: number;
  }>;
};

export function StockReportScreen() {
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');

  const q = useQuery({
    queryKey: ['reports-stock', category, brand],
    queryFn: async () => {
      const res = await api.get<StockOverview>('/reports/stock-overview', {
        params: {
          category: category.trim() || undefined,
          brand: brand.trim() || undefined,
        },
      });
      return res.data;
    },
  });

  if (q.isLoading && !q.data) return <ScreenState loading title="Stok raporu" />;
  if (q.isError && !q.data) {
    return <ScreenState tone="error" title="Stok" description={getApiErrorMessage(q.error)} />;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => void q.refetch()} />}
      style={styles.screen}
    >
      <View style={styles.filters}>
        <TextInput
          onChangeText={setCategory}
          placeholder="Kategori"
          style={styles.input}
          value={category}
        />
        <TextInput onChangeText={setBrand} placeholder="Marka" style={styles.input} value={brand} />
        <Pressable onPress={() => void q.refetch()} style={styles.btn}>
          <Text style={styles.btnTxt}>Uygula</Text>
        </Pressable>
      </View>
      <Text style={styles.h1}>Toplam stok değeri (maliyet)</Text>
      <Text style={styles.big}>{formatCurrency(Number(q.data?.totalStockValue ?? 0))}</Text>

      <Text style={styles.h2}>Kategori özeti</Text>
      {(q.data?.byCategory ?? []).map((c) => (
        <View key={c.category} style={styles.card}>
          <Text style={styles.cardTitle}>{c.category}</Text>
          <Text style={styles.cardMeta}>
            {c.variantCount} varyant · {c.totalQuantity} adet · {formatCurrency(Number(c.stockValue))}
          </Text>
        </View>
      ))}

      <Text style={styles.h2}>Kritik stok</Text>
      {(q.data?.lowStock ?? []).map((r) => (
        <View key={r.variantId} style={[styles.card, styles.crit]}>
          <Text style={styles.cardTitle}>
            {r.productName} ({r.barcode})
          </Text>
          <Text style={styles.cardMeta}>
            Stok {r.stockQuantity} / eşik {r.minStockLevel}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  big: { color: '#0f172a', fontSize: 24, fontWeight: '900' },
  btn: { alignSelf: 'flex-start', backgroundColor: '#4f46e5', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  btnTxt: { color: '#fff', fontWeight: '800' },
  card: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    padding: 12,
  },
  cardMeta: { color: '#64748b', marginTop: 4 },
  cardTitle: { color: '#0f172a', fontWeight: '800' },
  content: { padding: 16, paddingBottom: 40 },
  crit: { borderColor: '#fecaca', borderWidth: 2 },
  filters: { gap: 8, marginBottom: 16 },
  h1: { color: '#334155', fontSize: 14, fontWeight: '800' },
  h2: { color: '#334155', fontSize: 16, fontWeight: '900', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    paddingHorizontal: 12,
  },
  screen: { backgroundColor: '#f8fafc', flex: 1 },
});
