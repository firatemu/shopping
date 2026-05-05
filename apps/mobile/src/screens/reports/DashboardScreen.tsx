import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ScreenState } from '../../components/ScreenState';
import { PaymentPieChart } from '../../components/charts/PaymentPieChart';
import { TrendBarChart } from '../../components/charts/TrendBarChart';
import { api, getApiErrorMessage } from '../../lib/api';
import { formatCurrency } from '../../lib/money';
import type { AppStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<AppStackParamList>;

type DailySummary = {
  date: string;
  kpis: { lowStockAlerts: number; todayOrders: number };
  todaySales: {
    totalOrders: number;
    netRevenue: string;
    paymentBreakdown: Record<string, string>;
  };
  averageBasket: string;
};

type TrendDay = { date: string; netRevenue: string; salesCount: number };
type TopProduct = { productId: string; name: string; totalQuantity: number; totalRevenue: string };

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const summaryQuery = useQuery({
    queryKey: ['reports-daily-summary', today],
    queryFn: async () => {
      const res = await api.get<DailySummary>('/reports/daily-summary', { params: { date: today } });
      return res.data;
    },
  });

  const trendQuery = useQuery({
    queryKey: ['reports-sales-trend', 7],
    queryFn: async () => {
      const res = await api.get<TrendDay[]>('/reports/sales-trend', { params: { days: 7 } });
      return res.data;
    },
  });

  const topQuery = useQuery({
    queryKey: ['reports-top-products', today],
    queryFn: async () => {
      const res = await api.get<TopProduct[]>('/reports/top-products', {
        params: { dateFrom: today, dateTo: today, limit: 5 },
      });
      return res.data;
    },
  });

  const loading = summaryQuery.isLoading || trendQuery.isLoading || topQuery.isLoading;
  const err =
    summaryQuery.error || trendQuery.error || topQuery.error
      ? getApiErrorMessage(summaryQuery.error ?? trendQuery.error ?? topQuery.error)
      : null;

  const refreshing = summaryQuery.isFetching || trendQuery.isFetching || topQuery.isFetching;

  const paymentSlices = useMemo(() => {
    const br = summaryQuery.data?.todaySales?.paymentBreakdown ?? {};
    return Object.entries(br).map(([key, v]) => ({ key, value: Number(v) || 0 }));
  }, [summaryQuery.data]);

  const trendPoints = useMemo(() => {
    const rows = trendQuery.data ?? [];
    return rows.map((r) => ({
      label: r.date.slice(5),
      value: Number(r.netRevenue) || 0,
    }));
  }, [trendQuery.data]);

  if (loading && !summaryQuery.data) {
    return <ScreenState loading title="Rapor yükleniyor" />;
  }
  if (err && !summaryQuery.data) {
    return <ScreenState tone="error" title="Dashboard" description={err} />;
  }

  const low = summaryQuery.data?.kpis.lowStockAlerts ?? 0;

  return (
    <ScrollView
      refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void summaryQuery.refetch();
                void trendQuery.refetch();
                void topQuery.refetch();
              }}
            />
          }
      contentContainerStyle={styles.content}
      style={styles.screen}
    >
      <Text style={styles.h1}>Bugün ({today})</Text>
      <View style={styles.card}>
        <Text style={styles.metric}>Net ciro: {formatCurrency(Number(summaryQuery.data?.todaySales.netRevenue ?? 0))}</Text>
        <Text style={styles.sub}>Satış adedi: {summaryQuery.data?.todaySales.totalOrders ?? 0}</Text>
        <Text style={styles.sub}>Ort. sepet: {formatCurrency(Number(summaryQuery.data?.averageBasket ?? 0))}</Text>
      </View>

      <Text style={styles.h2}>Ödeme dağılımı</Text>
      <View style={styles.card}>
        <PaymentPieChart slices={paymentSlices} />
      </View>

      <Text style={styles.h2}>Son 7 gün (bar)</Text>
      <View style={styles.card}>
        <TrendBarChart points={trendPoints} />
      </View>

      <Text style={styles.h2}>En çok satanlar</Text>
      <View style={styles.card}>
        {(topQuery.data ?? []).map((p) => (
          <Text key={p.productId} style={styles.row}>
            {p.name} — {p.totalQuantity} ad · {formatCurrency(Number(p.totalRevenue))}
          </Text>
        ))}
      </View>

      <Pressable
        onPress={() =>
          navigation.dispatch(
            CommonActions.navigate({ name: 'Tabs', params: { screen: 'Inventory', params: undefined } }),
          )
        }
        style={styles.alertBox}
      >
        <Text style={styles.alertTitle}>Kritik stok uyarısı</Text>
        <Text style={styles.alertMeta}>{low} kalem eşik altında — envantere git</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  alertBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    padding: 14,
  },
  alertMeta: { color: '#991b1b', fontSize: 13, marginTop: 4 },
  alertTitle: { color: '#b91c1c', fontSize: 16, fontWeight: '900' },
  card: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  content: { gap: 12, padding: 16, paddingBottom: 40 },
  h1: { color: '#0f172a', fontSize: 22, fontWeight: '900' },
  h2: { color: '#334155', fontSize: 15, fontWeight: '800', marginTop: 8 },
  metric: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  row: { color: '#334155', fontSize: 14, fontWeight: '600' },
  screen: { backgroundColor: '#f8fafc', flex: 1 },
  sub: { color: '#64748b', fontSize: 14, fontWeight: '600' },
});
