import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import { formatCurrency } from '../../lib/money';
import { useCartStore } from '../../stores/cart.store';
import type { AppStackParamList } from '../../types/navigation';
import type { Customer, CustomerOrdersResponse, CustomerOrderRow } from '../../types/customer';

type Route = RouteProp<AppStackParamList, 'CustomerDetail'>;
type Nav = NativeStackNavigationProp<AppStackParamList>;

function paymentSummary(payments?: Array<{ type: string; amount: string | number }>): string {
  if (!payments?.length) return '—';
  const labels: Record<string, string> = {
    CASH: 'Nakit',
    CREDIT_CARD: 'Kart',
    BANK_TRANSFER: 'Havale',
    OPEN_ACCOUNT: 'Açık Hesap',
    GIFT_VOUCHER: 'Çek',
  };
  return payments.map((p) => `${labels[p.type] ?? p.type}`).join(', ');
}

export function CustomerDetailScreen() {
  const { params } = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const setCustomer = useCartStore((s) => s.setSelectedCustomer);

  const customerQuery = useQuery({
    queryKey: ['customer', params.customerId],
    queryFn: async () => {
      const res = await api.get<Customer>(`/customers/${params.customerId}`);
      return res.data;
    },
  });

  const ordersQuery = useQuery({
    queryKey: ['customer-orders', params.customerId],
    queryFn: async () => {
      const res = await api.get<CustomerOrdersResponse>(`/customers/${params.customerId}/orders`, {
        params: { limit: 50, page: 1 },
      });
      return res.data;
    },
  });

  const c = customerQuery.data;
  const balance = c?.currentBalance != null ? Number(c.currentBalance) : null;

  const startSale = () => {
    if (!c) return;
    const name = c.companyName || [c.name, c.surname].filter(Boolean).join(' ');
    setCustomer({ id: c.id, name });
    navigation.dispatch(CommonActions.navigate({ name: 'Tabs', params: { screen: 'POS' } }));
  };

  const goCollection = () => {
    if (!c) return;
    const name = c.companyName || [c.name, c.surname].filter(Boolean).join(' ');
    navigation.navigate('Collection', { customerId: c.id, customerName: name });
  };

  if (customerQuery.isLoading) {
    return <ScreenState loading title="Müşteri yükleniyor" />;
  }
  if (customerQuery.isError) {
    return (
      <ScreenState
        tone="error"
        title="Yüklenemedi"
        description={getApiErrorMessage(customerQuery.error)}
      />
    );
  }
  if (!c) {
    return <ScreenState title="Müşteri bulunamadı" />;
  }

  const label = c.companyName || [c.name, c.surname].filter(Boolean).join(' ');

  const renderOrder = ({ item }: { item: CustomerOrderRow }) => (
    <Pressable
      onPress={() => navigation.navigate('Receipt', { orderId: item.id })}
      style={styles.orderRow}
    >
      <View>
        <Text style={styles.orderNo}>{item.orderNumber}</Text>
        <Text style={styles.orderDate}>
          {new Date(item.createdAt).toLocaleString('tr-TR')}
        </Text>
        <Text style={styles.orderPay}>{paymentSummary(item.payments)}</Text>
      </View>
      <Text style={styles.orderTotal}>{formatCurrency(item.grandTotal)}</Text>
    </Pressable>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.meta}>{c.phone ?? '—'} · {c.email ?? '—'}</Text>
        <Text style={styles.meta}>{c.address ?? 'Adres yok'}</Text>
        <Text style={styles.meta}>
          Doğum: {c.birthDate ? new Date(c.birthDate).toLocaleDateString('tr-TR') : '—'}
        </Text>
        <Text style={styles.meta}>TC / Vergi No: {c.taxId ?? '—'}</Text>
        <Text style={[styles.balance, balance != null && balance > 0 && styles.debt]}>
          Cari bakiye: {balance == null ? '—' : formatCurrency(balance)}
          {balance != null && balance > 0 ? ' (borç)' : balance != null && balance < 0 ? ' (alacak)' : ''}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={startSale} style={styles.btnPrimary}>
          <Text style={styles.btnPrimaryText}>Yeni Satış</Text>
        </Pressable>
        <Pressable onPress={goCollection} style={styles.btnSecondary}>
          <Text style={styles.btnSecondaryText}>Ödeme Al</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Satış geçmişi</Text>
      {ordersQuery.isLoading ? (
        <Text style={styles.muted}>Yükleniyor…</Text>
      ) : ordersQuery.isError ? (
        <Text style={styles.err}>{getApiErrorMessage(ordersQuery.error)}</Text>
      ) : !ordersQuery.data?.data.length ? (
        <Text style={styles.muted}>Kayıtlı satış yok</Text>
      ) : (
        <FlatList
          scrollEnabled={false}
          data={ordersQuery.data.data}
          keyExtractor={(o) => o.id}
          renderItem={renderOrder}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8 },
  balance: { fontSize: 16, fontWeight: '900', marginTop: 8 },
  btnPrimary: {
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    flex: 1,
    height: 46,
    justifyContent: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '800' },
  btnSecondary: {
    alignItems: 'center',
    borderColor: '#4f46e5',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    height: 46,
    justifyContent: 'center',
  },
  btnSecondaryText: { color: '#4f46e5', fontWeight: '800' },
  card: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    padding: 16,
  },
  container: { backgroundColor: '#f8fafc', flex: 1 },
  content: { gap: 16, padding: 16 },
  debt: { color: '#dc2626' },
  err: { color: '#dc2626' },
  meta: { color: '#64748b', fontSize: 14 },
  muted: { color: '#64748b' },
  orderDate: { color: '#64748b', fontSize: 12 },
  orderNo: { color: '#0f172a', fontWeight: '800' },
  orderPay: { color: '#64748b', fontSize: 12 },
  orderRow: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    padding: 12,
  },
  orderTotal: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  section: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  title: { color: '#0f172a', fontSize: 22, fontWeight: '900' },
});
