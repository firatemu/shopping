import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../lib/api';
import { formatCurrency } from '../../lib/money';
import { ScreenState } from '../../components/ScreenState';

type Cat = { id: string; name: string; kind: string };

export function ExpenseCategoryScreen() {
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getFullYear(), to.getMonth(), 1);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, []);

  const catsQ = useQuery({
    queryKey: ['expense-categories-all'],
    queryFn: async () => {
      const res = await api.get<Cat[]>('/expenses/categories');
      return res.data;
    },
  });

  const sumQ = useQuery({
    queryKey: ['expenses-summary-cat', range.from, range.to],
    queryFn: async () => {
      const res = await api.get<{
        categoriesBreakdown: Array<{
          categoryId: string;
          name: string;
          kind: string;
          income: string;
          expense: string;
        }>;
      }>('/expenses/summary', { params: { dateFrom: range.from, dateTo: range.to } });
      return res.data;
    },
  });

  const byId = useMemo(() => {
    const m = new Map<string, { income: number; expense: number }>();
    for (const b of sumQ.data?.categoriesBreakdown ?? []) {
      m.set(b.categoryId, { income: Number(b.income), expense: Number(b.expense) });
    }
    return m;
  }, [sumQ.data]);

  if (catsQ.isError) {
    return <ScreenState tone="error" title="Kategoriler" description={getApiErrorMessage(catsQ.error)} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <Text style={styles.h1}>Kategoriler (aylık hareket)</Text>
      <Text style={styles.sub}>
        {range.from} — {range.to}
      </Text>
      {(catsQ.data ?? []).map((c) => {
        const t = byId.get(c.id);
        const val = c.kind === 'INCOME' ? t?.income ?? 0 : t?.expense ?? 0;
        return (
          <View key={c.id} style={styles.card}>
            <Text style={styles.name}>
              {c.name} · {c.kind}
            </Text>
            <Text style={styles.amt}>Bu dönem: {formatCurrency(val)}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  amt: { color: '#0f172a', fontWeight: '800', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    padding: 14,
  },
  content: { padding: 16, paddingBottom: 40 },
  h1: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  name: { color: '#334155', fontWeight: '800' },
  screen: { backgroundColor: '#f8fafc', flex: 1 },
  sub: { color: '#64748b', marginBottom: 16, marginTop: 4 },
});
