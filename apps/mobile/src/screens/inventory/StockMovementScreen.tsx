import { useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import type { AppStackParamList } from '../../types/navigation';
import type { StockMovementsResponse, StockMovementRow } from '../../types/inventory';

type Route = RouteProp<AppStackParamList, 'StockMovement'>;

const TYPE_LABEL: Record<string, string> = {
  ADJUSTMENT: 'Düzeltme',
  PURCHASE: 'Giriş',
  RELEASE: 'Rezerv iptal',
  RESERVATION: 'Rezerv',
  RETURN: 'İade',
  SALE: 'Satış',
  TRANSFER: 'Transfer',
};

export function StockMovementScreen() {
  const { params } = useRoute<Route>();

  const query = useInfiniteQuery({
    queryFn: async ({ pageParam }) => {
      const res = await api.get<StockMovementsResponse>(`/inventory/movements/${params.variantId}`, {
        params: { limit: 50, page: pageParam },
      });
      return res.data;
    },
    getNextPageParam: (lastPage) => {
      const p = lastPage as StockMovementsResponse;
      return p.meta.page < p.meta.totalPages ? p.meta.page + 1 : undefined;
    },
    initialPageParam: 1,
    queryKey: ['stock-movements', params.variantId],
  });

  const rows = query.data?.pages.flatMap((p) => (p as StockMovementsResponse).data) ?? [];

  const renderItem = useCallback(
    ({ item }: { item: StockMovementRow }) => (
      <View style={styles.row}>
        <View>
          <Text style={styles.type}>{TYPE_LABEL[item.type] ?? item.type}</Text>
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
          <Text style={styles.meta}>Kullanıcı: {item.createdBy.slice(0, 8)}…</Text>
          {item.reason ? <Text style={styles.meta}>{item.reason}</Text> : null}
        </View>
        <View style={styles.qtyCol}>
          <Text style={styles.qty}>Δ {item.quantity > 0 ? '+' : ''}{item.quantity}</Text>
          <Text style={styles.meta}>{item.previousQty} → {item.newQty}</Text>
        </View>
      </View>
    ),
    [],
  );

  return (
    <View style={styles.container}>
      {params.title ? <Text style={styles.header}>{params.title}</Text> : null}
      {query.isLoading ? (
        <ScreenState loading title="Hareketler" />
      ) : query.isError ? (
        <ScreenState tone="error" title="Hata" description={getApiErrorMessage(query.error)} />
      ) : rows.length === 0 ? (
        <ScreenState title="Hareket yok" />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
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
  container: { backgroundColor: '#f8fafc', flex: 1 },
  date: { color: '#64748b', fontSize: 12 },
  footer: { padding: 16 },
  header: { fontWeight: '900', padding: 16 },
  meta: { color: '#64748b', fontSize: 12 },
  qty: { color: '#0f172a', fontSize: 16, fontWeight: '800', textAlign: 'right' },
  qtyCol: { alignItems: 'flex-end' },
  row: {
    backgroundColor: '#fff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  type: { color: '#0f172a', fontWeight: '800' },
});
