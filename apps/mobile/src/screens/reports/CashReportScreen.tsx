import { useMemo, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import { formatCurrency } from '../../lib/money';

type CashReport = {
  period: { from: string; to: string };
  cashFlow: { cashIn: string; cashOut: string; net: string };
  sessions: Array<{
    id: string;
    status: string;
    openedAt: string;
    closedAt: string | null;
    openingBalance: string;
    totalCash: string;
    totalCard: string;
    totalSales: number;
    difference: string | null;
    notes: string | null;
    adjustments: Array<{ amount: string; reason: string }>;
  }>;
};

export function CashReportScreen() {
  const [from, setFrom] = useState(() => new Date());
  const [to, setTo] = useState(() => new Date());
  const [showF, setShowF] = useState(false);
  const [showT, setShowT] = useState(false);

  const fromStr = useMemo(() => from.toISOString().slice(0, 10), [from]);
  const toStr = useMemo(() => to.toISOString().slice(0, 10), [to]);

  const q = useQuery({
    queryKey: ['reports-cash', fromStr, toStr],
    queryFn: async () => {
      const res = await api.get<CashReport>('/reports/cash-sessions', {
        params: { dateFrom: fromStr, dateTo: toStr },
      });
      return res.data;
    },
  });

  if (q.isLoading && !q.data) return <ScreenState loading title="Kasa raporu" />;
  if (q.isError && !q.data) {
    return <ScreenState tone="error" title="Kasa" description={getApiErrorMessage(q.error)} />;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => void q.refetch()} />}
      style={styles.screen}
    >
      <View style={styles.row}>
        <Pressable onPress={() => setShowF(true)} style={styles.dt}>
          <Text style={styles.dtL}>Başlangıç</Text>
          <Text style={styles.dtV}>{fromStr}</Text>
        </Pressable>
        <Pressable onPress={() => setShowT(true)} style={styles.dt}>
          <Text style={styles.dtL}>Bitiş</Text>
          <Text style={styles.dtV}>{toStr}</Text>
        </Pressable>
      </View>
      {showF ? (
        <DateTimePicker
          display="default"
          mode="date"
          value={from}
          onChange={(_: DateTimePickerEvent, d?: Date) => {
            setShowF(Platform.OS === 'ios');
            if (d) setFrom(d);
          }}
        />
      ) : null}
      {showT ? (
        <DateTimePicker
          display="default"
          mode="date"
          value={to}
          onChange={(_: DateTimePickerEvent, d?: Date) => {
            setShowT(Platform.OS === 'ios');
            if (d) setTo(d);
          }}
        />
      ) : null}

      <View style={styles.sum}>
        <Text style={styles.sumT}>
          Nakit giriş: {formatCurrency(Number(q.data?.cashFlow.cashIn ?? 0))}
        </Text>
        <Text style={styles.sumT}>
          Nakit çıkış: {formatCurrency(Number(q.data?.cashFlow.cashOut ?? 0))}
        </Text>
        <Text style={styles.sumN}>Net (düzeltmeler): {formatCurrency(Number(q.data?.cashFlow.net ?? 0))}</Text>
      </View>

      {(q.data?.sessions ?? []).map((s) => (
        <View key={s.id} style={styles.card}>
          <Text style={styles.cardTitle}>
            {s.status} · {new Date(s.openedAt).toLocaleString('tr-TR')}
          </Text>
          <Text style={styles.meta}>Açılış: TB {s.openingBalance}</Text>
          <Text style={styles.meta}>Nakit: TB {s.totalCash} · Kart: TB {s.totalCard}</Text>
          <Text style={styles.meta}>Satış adedi: {s.totalSales}</Text>
          {s.closedAt ? (
            <Text style={styles.meta}>Kapanış: {new Date(s.closedAt).toLocaleString('tr-TR')}</Text>
          ) : null}
          {s.difference != null ? <Text style={styles.meta}>Fark: {s.difference}</Text> : null}
          {s.notes ? <Text style={styles.meta}>Not: {s.notes}</Text> : null}
          {s.adjustments.length > 0 ? (
            <Text style={styles.adj}>
              Düzeltmeler: {s.adjustments.map((a) => `${a.reason} (${a.amount})`).join('; ')}
            </Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  adj: { color: '#92400e', fontSize: 12, marginTop: 6 },
  card: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  cardTitle: { color: '#0f172a', fontWeight: '900' },
  content: { padding: 16, paddingBottom: 40 },
  dt: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    padding: 10,
  },
  dtL: { color: '#64748b', fontSize: 11 },
  dtV: { color: '#0f172a', fontWeight: '800' },
  meta: { color: '#64748b', marginTop: 2 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  screen: { backgroundColor: '#f8fafc', flex: 1 },
  sum: { backgroundColor: '#eef2ff', borderRadius: 14, marginBottom: 16, padding: 14 },
  sumN: { color: '#312e81', fontSize: 16, fontWeight: '900', marginTop: 8 },
  sumT: { color: '#4338ca', fontWeight: '700' },
});
