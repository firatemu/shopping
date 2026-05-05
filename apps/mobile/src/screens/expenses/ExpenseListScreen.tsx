import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import { formatCurrency } from '../../lib/money';
import type { AppStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<AppStackParamList>;

type ExpenseRow = {
  id: string;
  type: string;
  amount: number;
  description?: string | null;
  date: string;
  categoryName: string;
  reference?: string | null;
};

export function ExpenseListScreen() {
  const navigation = useNavigation<Nav>();
  const [type, setType] = useState<'INCOME' | 'EXPENSE' | undefined>();

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getFullYear(), to.getMonth(), 1);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, []);

  const sumQ = useQuery({
    queryKey: ['expenses-summary', range.from, range.to],
    queryFn: async () => {
      const res = await api.get<{
        income: string;
        expense: string;
        net: string;
      }>('/expenses/summary', { params: { dateFrom: range.from, dateTo: range.to } });
      return res.data;
    },
  });

  const q = useInfiniteQuery({
    queryKey: ['expenses-list', type],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await api.get<{ data: ExpenseRow[]; meta: { totalPages: number; page: number } }>(
        '/expenses',
        {
          params: {
            page: pageParam,
            limit: 20,
            type: type ?? undefined,
            dateFrom: range.from,
            dateTo: range.to,
          },
        },
      );
      return res.data;
    },
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  });

  const rows = q.data?.pages.flatMap((p) => p.data) ?? [];

  if (q.isError && !q.data) {
    return <ScreenState tone="error" title="Gelir-gider" description={getApiErrorMessage(q.error)} />;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.sum}>
        <Text style={styles.sumT}>Gelir: {formatCurrency(Number(sumQ.data?.income ?? 0))}</Text>
        <Text style={styles.sumT}>Gider: {formatCurrency(Number(sumQ.data?.expense ?? 0))}</Text>
        <Text style={styles.sumN}>Net: {formatCurrency(Number(sumQ.data?.net ?? 0))}</Text>
        <Text style={styles.per}>Dönem: {range.from} — {range.to}</Text>
      </View>
      <View style={styles.tabs}>
        {(['all', 'INCOME', 'EXPENSE'] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => setType(k === 'all' ? undefined : k)}
            style={[styles.tab, (k === 'all' && !type) || type === k ? styles.tabOn : null]}
          >
            <Text style={styles.tabT}>{k === 'all' ? 'Tümü' : k === 'INCOME' ? 'Gelir' : 'Gider'}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => navigation.navigate('ExpenseCategories')} style={styles.tab}>
          <Text style={styles.tabT}>Kategoriler</Text>
        </Pressable>
      </View>
      <Pressable onPress={() => navigation.navigate('NewExpense')} style={styles.new}>
        <Text style={styles.newT}>+ Yeni kayıt</Text>
      </Pressable>
      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        onEndReached={() => {
          if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
        }}
        refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => void q.refetch()} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>
              {item.type} · {item.categoryName}
            </Text>
            <Text style={styles.rowAmt}>{formatCurrency(item.amount)}</Text>
            <Text style={styles.rowMeta}>{item.date.slice(0, 10)} — {item.description ?? '—'}</Text>
            {item.reference ? <Text style={styles.rowMeta}>Kaynak: {item.reference}</Text> : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  new: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 14,
  },
  newT: { color: '#fff', fontWeight: '900', textAlign: 'center' },
  per: { color: '#64748b', fontSize: 12, marginTop: 6 },
  row: {
    backgroundColor: '#fff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    padding: 16,
  },
  rowAmt: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  rowMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  rowTitle: { color: '#334155', fontWeight: '800' },
  sum: { backgroundColor: '#f1f5f9', padding: 16 },
  sumN: { color: '#0f172a', fontSize: 18, fontWeight: '900', marginTop: 8 },
  sumT: { color: '#475569', fontWeight: '700' },
  tab: {
    borderColor: '#cbd5e1',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabOn: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  tabT: { color: '#334155', fontSize: 12, fontWeight: '700' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  wrap: { backgroundColor: '#f8fafc', flex: 1 },
});
