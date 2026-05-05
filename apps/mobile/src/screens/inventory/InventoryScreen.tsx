import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import type { AppStackParamList, AppTabParamList } from '../../types/navigation';
import type { StockSummaryResponse, StockSummaryRow } from '../../types/inventory';

type TabRoute = RouteProp<AppTabParamList, 'Inventory'>;
type StackNav = NativeStackNavigationProp<AppStackParamList>;

const PAGE = 30;

export function InventoryScreen() {
  const navigation = useNavigation<StackNav>();
  const route = useRoute<TabRoute>();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [lowOnly, setLowOnly] = useState(false);

  useEffect(() => {
    const b = route.params?.initialBarcode;
    if (b) setSearch(b);
  }, [route.params?.initialBarcode]);

  const filters = useMemo(
    () => ({
      brand: brand.trim(),
      category: category.trim(),
      search: search.trim(),
    }),
    [brand, category, search],
  );

  const query = useInfiniteQuery({
    queryFn: async ({ pageParam }) => {
      const res = await api.get<StockSummaryResponse>('/inventory/summary', {
        params: {
          brand: filters.brand || undefined,
          category: filters.category || undefined,
          limit: PAGE,
          lowStockOnly: lowOnly || undefined,
          page: pageParam,
          search: filters.search || undefined,
        },
      });
      return res.data;
    },
    getNextPageParam: (lastPage) => {
      const p = lastPage as StockSummaryResponse;
      return p.meta.page < p.meta.totalPages ? p.meta.page + 1 : undefined;
    },
    initialPageParam: 1,
    queryKey: ['inventory-summary', filters, lowOnly],
    staleTime: 60 * 1000,
  });

  const rows = query.data?.pages.flatMap((p) => (p as StockSummaryResponse).data) ?? [];

  const openRow = useCallback(
    (row: StockSummaryRow) => {
      navigation.navigate('StockMovement', {
        title: `${row.productName} · ${row.color}/${row.size}`,
        variantId: row.id,
      });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: StockSummaryRow }) => (
      <Pressable onPress={() => openRow(item)} style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={styles.name}>{item.productName}</Text>
          <Text style={styles.meta}>{item.color} / {item.size} · {item.barcode}</Text>
          <Text style={styles.meta}>{item.brand ?? '—'} · Kritik: {item.minStockLevel}</Text>
        </View>
        <View style={styles.right}>
          {item.isLowStock ? <Text style={styles.badge}>Kritik</Text> : null}
          <Text style={styles.stock}>{item.stockQuantity}</Text>
        </View>
      </Pressable>
    ),
    [openRow],
  );

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <View style={styles.searchRow}>
          <TextInput
            onChangeText={setSearch}
            placeholder="Ürün veya barkod…"
            style={styles.search}
            value={search}
          />
          <Pressable
            onPress={() => navigation.navigate('BarcodeScanner', { mode: 'inventory' })}
            style={styles.cam}
          >
            <Text style={styles.camText}>📷</Text>
          </Pressable>
        </View>
        <TextInput onChangeText={setCategory} placeholder="Kategori" style={styles.smallInput} value={category} />
        <TextInput onChangeText={setBrand} placeholder="Marka" style={styles.smallInput} value={brand} />
        <Pressable
          onPress={() => setLowOnly((v) => !v)}
          style={[styles.lowBtn, lowOnly && styles.lowBtnOn]}
        >
          <Text style={styles.lowText}>{lowOnly ? 'Düşük stok ✓' : 'Düşük stok'}</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('StockAdjustment')}
          style={styles.adjBtn}
        >
          <Text style={styles.adjText}>Stok düzelt</Text>
        </Pressable>
      </View>

      {query.isLoading ? (
        <ScreenState loading title="Stok yükleniyor" />
      ) : query.isError ? (
        <ScreenState tone="error" title="Yüklenemedi" description={getApiErrorMessage(query.error)} />
      ) : rows.length === 0 ? (
        <ScreenState title="Kayıt yok" description="Filtreleri değiştirin." />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
          onEndReachedThreshold={0.35}
          renderItem={renderItem}
          ListFooterComponent={
            query.isFetchingNextPage ? <ActivityIndicator color="#4f46e5" style={styles.footer} /> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  adjBtn: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    marginTop: 8,
  },
  adjText: { color: '#fff', fontWeight: '800' },
  badge: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cam: {
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 48,
  },
  camText: { fontSize: 20 },
  container: { backgroundColor: '#f8fafc', flex: 1 },
  filters: {
    backgroundColor: '#fff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    padding: 12,
  },
  footer: { padding: 16 },
  lowBtn: {
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    marginTop: 8,
  },
  lowBtnOn: { backgroundColor: '#fef2f2', borderColor: '#dc2626' },
  lowText: { fontWeight: '800' },
  meta: { color: '#64748b', fontSize: 12 },
  name: { color: '#0f172a', fontSize: 15, fontWeight: '800' },
  right: { alignItems: 'flex-end', gap: 4 },
  row: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  search: {
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
  },
  searchRow: { flexDirection: 'row', gap: 8 },
  smallInput: {
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    marginTop: 8,
    paddingHorizontal: 12,
  },
  stock: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
});
