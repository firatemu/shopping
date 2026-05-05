import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import { formatCurrency, toCents } from '../../lib/money';
import type { AppStackParamList } from '../../types/navigation';
import type { Customer } from '../../types/customer';
import type { RecordPaymentResponse } from '../../types/customer';

type Route = RouteProp<AppStackParamList, 'Collection'>;

export function CollectionScreen() {
  const { params } = useRoute<Route>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'PAYMENT_CASH' | 'PAYMENT_CARD'>('PAYMENT_CASH');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const customerQuery = useQuery({
    queryKey: ['customer', params.customerId],
    queryFn: async () => {
      const res = await api.get<Customer>(`/customers/${params.customerId}`);
      return res.data;
    },
  });

  const balanceNum = customerQuery.data?.currentBalance != null
    ? Number(customerQuery.data.currentBalance)
    : null;

  const submit = async () => {
    const cents = toCents(amount);
    if (cents <= 0) {
      setErr('Tutar girin');
      return;
    }
    if (balanceNum != null && balanceNum > 0 && cents / 100 > balanceNum + 0.01) {
      Alert.alert(
        'Tutar yüksek',
        'Tahsilat tutarı mevcut borçtan yüksek. Devam edilsin mi?',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Devam',
            onPress: () => void doPay(cents),
          },
        ],
      );
      return;
    }
    await doPay(cents);
  };

  const doPay = async (cents: number) => {
    setSaving(true);
    setErr(null);
    try {
      const res = await api.post<RecordPaymentResponse>('/customers/payments', {
        amount: cents / 100,
        customerId: params.customerId,
        description: 'Mobil tahsilat',
        method,
      });
      await queryClient.invalidateQueries({ queryKey: ['customer', params.customerId] });
      await queryClient.invalidateQueries({ queryKey: ['customers-list'] });
      const nb = Number(res.data.newBalance);
      Alert.alert(
        'Tahsilat kaydedildi',
        `Yeni bakiye: ${formatCurrency(nb)}`,
        [{ text: 'Tamam', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (customerQuery.isLoading) return <ScreenState loading title="Bakiye yükleniyor" />;
  if (customerQuery.isError) {
    return <ScreenState tone="error" title="Hata" description={getApiErrorMessage(customerQuery.error)} />;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.name}>{params.customerName}</Text>
      <Text style={styles.balance}>
        Mevcut bakiye: {balanceNum == null ? '—' : formatCurrency(balanceNum)}
      </Text>

      <Text style={styles.label}>Tahsilat (TL)</Text>
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={setAmount}
        placeholder="0.00"
        style={styles.input}
        value={amount}
      />

      <Text style={styles.label}>Ödeme tipi</Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => setMethod('PAYMENT_CASH')}
          style={[styles.chip, method === 'PAYMENT_CASH' && styles.chipOn]}
        >
          <Text style={styles.chipText}>Nakit</Text>
        </Pressable>
        <Pressable
          onPress={() => setMethod('PAYMENT_CARD')}
          style={[styles.chip, method === 'PAYMENT_CARD' && styles.chipOn]}
        >
          <Text style={styles.chipText}>Kart</Text>
        </Pressable>
      </View>

      {err ? <Text style={styles.err}>{err}</Text> : null}

      <Pressable disabled={saving} onPress={() => void submit()} style={styles.btn}>
        <Text style={styles.btnText}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  balance: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
  btn: {
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    marginTop: 16,
  },
  btnText: { color: '#fff', fontWeight: '900' },
  chip: {
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    height: 44,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: '#eef2ff', borderColor: '#4f46e5' },
  chipText: { fontWeight: '800' },
  err: { color: '#dc2626', marginTop: 8 },
  input: {
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  label: { color: '#64748b', fontWeight: '700', marginBottom: 6 },
  name: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  wrap: { backgroundColor: '#f8fafc', flex: 1, padding: 16 },
});
