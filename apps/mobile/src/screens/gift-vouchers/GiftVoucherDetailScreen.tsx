import { ScrollView, StyleSheet, Text, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import { formatCurrency } from '../../lib/money';
import type { AppStackParamList } from '../../types/navigation';

type R = RouteProp<AppStackParamList, 'GiftVoucherDetail'>;
type Nav = NativeStackNavigationProp<AppStackParamList>;

export function GiftVoucherDetailScreen() {
  const { params } = useRoute<R>();
  const navigation = useNavigation<Nav>();

  const q = useQuery({
    queryKey: ['gift-voucher', params.voucherId],
    queryFn: async () => {
      const res = await api.get(`/gift-vouchers/${params.voucherId}`);
      return res.data as {
        code: string;
        initialBalance: string;
        currentBalance: string;
        effectiveStatus: string;
        expiresAt: string | null;
        redemptions: Array<{ orderNumber?: string; amount: string; orderId: string }>;
      };
    },
  });

  if (q.isLoading && !q.data) return <ScreenState loading title="Hediye çeki" />;
  if (q.isError && !q.data) {
    return <ScreenState tone="error" title="Çek" description={getApiErrorMessage(q.error)} />;
  }

  const d = q.data!;

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <Text style={styles.code}>{d.code}</Text>
      <Text style={styles.meta}>Durum: {d.effectiveStatus}</Text>
      <Text style={styles.meta}>Orijinal: {formatCurrency(Number(d.initialBalance))}</Text>
      <Text style={styles.meta}>Kalan: {formatCurrency(Number(d.currentBalance))}</Text>
      <Text style={styles.meta}>Geçerlilik: {d.expiresAt ? d.expiresAt.slice(0, 10) : '—'}</Text>

      <Text style={styles.h2}>Kullanımlar</Text>
      {d.redemptions.map((r) => (
        <Pressable
          key={r.orderId + r.amount}
          onPress={() => navigation.navigate('Receipt', { orderId: r.orderId })}
          style={styles.line}
        >
          <Text style={styles.lineT}>
            Fiş {r.orderNumber ?? r.orderId.slice(0, 8)} — {formatCurrency(Number(r.amount))}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  code: { color: '#0f172a', fontSize: 24, fontWeight: '900' },
  content: { padding: 16, paddingBottom: 40 },
  h2: { color: '#334155', fontSize: 16, fontWeight: '900', marginTop: 20 },
  line: { backgroundColor: '#fff', borderRadius: 12, marginTop: 8, padding: 12 },
  lineT: { color: '#0f172a', fontWeight: '700' },
  meta: { color: '#64748b', marginTop: 4 },
  screen: { backgroundColor: '#f8fafc', flex: 1 },
});
