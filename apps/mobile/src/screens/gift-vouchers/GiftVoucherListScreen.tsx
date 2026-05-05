import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import { formatCurrency } from '../../lib/money';
import { useAuthStore } from '../../stores/auth.store';
import type { AppStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<AppStackParamList>;

type GV = {
  id: string;
  code: string;
  initialBalance: { toString(): string } | string;
  currentBalance: { toString(): string } | string;
  status: string;
  expiresAt: string | null;
};

export function GiftVoucherListScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const canCreate = ['TENANT_ADMIN', 'STORE_MANAGER', 'ACCOUNTANT'].includes(user?.role ?? '');
  const [search, setSearch] = useState('');
  const [st, setSt] = useState<'ALL' | 'ACTIVE' | 'USED' | 'EXPIRED'>('ALL');

  const cycleFilter = useCallback(() => {
    const order = ['ALL', 'ACTIVE', 'USED', 'EXPIRED'] as const;
    const i = order.indexOf(st);
    setSt(order[(i + 1) % order.length]);
  }, [st]);

  const q = useInfiniteQuery({
    queryKey: ['gift-vouchers', search, st],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await api.get<{ data: GV[]; meta: { totalPages: number; page: number } }>(
        '/gift-vouchers',
        {
          params: {
            page: pageParam,
            limit: 20,
            search: search.trim() || undefined,
            status: st === 'ALL' ? undefined : st,
          },
        },
      );
      return res.data;
    },
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });

  const rows = q.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <TextInput
          onChangeText={setSearch}
          placeholder="Kod veya firma ara…"
          style={styles.search}
          value={search}
        />
        <Pressable onPress={cycleFilter} style={styles.filt}>
          <Text style={styles.filtT}>{st}</Text>
        </Pressable>
        {canCreate ? (
          <Pressable onPress={() => navigation.navigate('NewGiftVoucher')} style={styles.new}>
            <Text style={styles.newT}>+</Text>
          </Pressable>
        ) : null}
      </View>
      {q.isError ? (
        <ScreenState tone="error" title="Çekler" description={getApiErrorMessage(q.error)} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(i) => i.id}
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
          }}
          refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => void q.refetch()} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate('GiftVoucherDetail', { voucherId: item.id })}
              style={styles.row}
            >
              <Text style={styles.code}>{item.code}</Text>
              <Text style={styles.meta}>
                Bakiye: {formatCurrency(Number(String(item.currentBalance)))} / tutar:{' '}
                {formatCurrency(Number(String(item.initialBalance)))}
              </Text>
              <Text style={styles.meta}>
                {item.status} · {item.expiresAt ? item.expiresAt.slice(0, 10) : 'Süresiz'}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  code: { color: '#0f172a', fontSize: 17, fontWeight: '900' },
  filt: { backgroundColor: '#eef2ff', borderRadius: 12, justifyContent: 'center', paddingHorizontal: 12 },
  filtT: { color: '#3730a3', fontWeight: '800' },
  head: { flexDirection: 'row', gap: 8, padding: 12 },
  meta: { color: '#64748b', marginTop: 2 },
  new: {
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    justifyContent: 'center',
    width: 44,
  },
  newT: { color: '#fff', fontSize: 22, fontWeight: '900' },
  row: { backgroundColor: '#fff', borderBottomColor: '#e2e8f0', borderBottomWidth: 1, padding: 16 },
  search: {
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
  },
  wrap: { backgroundColor: '#f8fafc', flex: 1 },
});
