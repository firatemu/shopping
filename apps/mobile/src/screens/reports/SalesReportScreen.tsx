import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import { formatCurrency } from '../../lib/money';
import type { AppStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<AppStackParamList>;

type SaleRow = {
  id: string;
  orderNumber: string;
  grandTotal: string;
  createdAt: string;
  customer: { name?: string; surname?: string; companyName?: string | null; phone?: string | null } | null;
  payments: Array<{ type: string; amount: string }>;
};

type SalesResponse = {
  summary: {
    completedCount: number;
    returnCount: number;
    netTotal: string;
  };
  data: SaleRow[];
  meta: { page: number; totalPages: number; total: number };
};

const PAGE = 20;

export function SalesReportScreen() {
  const navigation = useNavigation<Nav>();
  const [start, setStart] = useState(() => new Date());
  const [end, setEnd] = useState(() => new Date());
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [payFilter, setPayFilter] = useState<string | undefined>();

  const startStr = useMemo(() => start.toISOString().slice(0, 10), [start]);
  const endStr = useMemo(() => end.toISOString().slice(0, 10), [end]);

  const query = useInfiniteQuery({
    queryKey: ['reports-sales', startStr, endStr, payFilter],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await api.get<SalesResponse>('/reports/sales', {
        params: {
          startDate: startStr,
          endDate: endStr,
          page: pageParam,
          limit: PAGE,
          paymentType: payFilter || undefined,
        },
      });
      return res.data;
    },
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  });

  const rows = query.data?.pages.flatMap((p) => p.data) ?? [];
  const summary = query.data?.pages[0]?.summary;

  const onPickStart = (_: DateTimePickerEvent, d?: Date) => {
    setShowStart(Platform.OS === 'ios');
    if (d) setStart(d);
  };
  const onPickEnd = (_: DateTimePickerEvent, d?: Date) => {
    setShowEnd(Platform.OS === 'ios');
    if (d) setEnd(d);
  };

  const payCycle = useCallback(() => {
    const order = [undefined, 'CASH', 'CREDIT_CARD', 'GIFT_VOUCHER'] as const;
    const i = order.indexOf(payFilter as (typeof order)[number]);
    setPayFilter(order[(i + 1) % order.length] as string | undefined);
  }, [payFilter]);

  if (query.isError && !query.data) {
    return <ScreenState tone="error" title="Satış raporu" description={getApiErrorMessage(query.error)} />;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.filters}>
        <Pressable onPress={() => setShowStart(true)} style={styles.dt}>
          <Text style={styles.dtLbl}>Başlangıç</Text>
          <Text style={styles.dtVal}>{startStr}</Text>
        </Pressable>
        <Pressable onPress={() => setShowEnd(true)} style={styles.dt}>
          <Text style={styles.dtLbl}>Bitiş</Text>
          <Text style={styles.dtVal}>{endStr}</Text>
        </Pressable>
        <Pressable onPress={payCycle} style={styles.payBtn}>
          <Text style={styles.payBtnTxt}>Ödeme: {payFilter ?? 'Hepsi'}</Text>
        </Pressable>
      </View>
      {showStart ? (
        <DateTimePicker mode="date" value={start} onChange={onPickStart} display="default" />
      ) : null}
      {showEnd ? (
        <DateTimePicker mode="date" value={end} onChange={onPickEnd} display="default" />
      ) : null}

      {summary ? (
        <View style={styles.sum}>
          <Text style={styles.sumT}>Net: {formatCurrency(Number(summary.netTotal))}</Text>
          <Text style={styles.sumS}>
            Satış: {summary.completedCount} · İade: {summary.returnCount}
          </Text>
        </View>
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => void query.refetch()} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('Receipt', { orderId: item.id })}
            style={styles.row}
          >
            <Text style={styles.order}>{item.orderNumber}</Text>
            <Text style={styles.meta}>
              {new Date(item.createdAt).toLocaleString('tr-TR')} ·{' '}
              {item.customer?.companyName ||
                [item.customer?.name, item.customer?.surname].filter(Boolean).join(' ') ||
                '—'}
            </Text>
            <Text style={styles.total}>{formatCurrency(Number(item.grandTotal))}</Text>
            <Text style={styles.pay}>{item.payments.map((p) => `${p.type}`).join(', ')}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dt: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    padding: 10,
  },
  dtLbl: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  dtVal: { color: '#0f172a', fontWeight: '800' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  meta: { color: '#64748b', fontSize: 12 },
  order: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  pay: { color: '#475569', fontSize: 12, marginTop: 4 },
  payBtn: {
    alignSelf: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  payBtnTxt: { color: '#3730a3', fontWeight: '800' },
  row: {
    backgroundColor: '#fff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sum: { backgroundColor: '#f1f5f9', padding: 12 },
  sumS: { color: '#64748b', marginTop: 4 },
  sumT: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  total: { color: '#0f172a', fontSize: 15, fontWeight: '800', marginTop: 4 },
  wrap: { backgroundColor: '#f8fafc', flex: 1 },
});
