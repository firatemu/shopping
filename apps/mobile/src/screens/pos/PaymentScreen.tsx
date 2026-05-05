import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, getApiErrorMessage } from '../../lib/api';
import { centsToNumber, formatCurrencyFromCents, toCents } from '../../lib/money';
import { useCartStore } from '../../stores/cart.store';
import type { AppStackParamList } from '../../types/navigation';
import type { CheckoutPayment, PaymentType } from '../../types/sales';

type Navigation = NativeStackNavigationProp<AppStackParamList>;

type PayMode = PaymentType | 'MIXED';

const methods: Array<{ label: string; type: PayMode }> = [
  { label: 'Nakit', type: 'CASH' },
  { label: 'Kredi Kartı', type: 'CREDIT_CARD' },
  { label: 'Karma', type: 'MIXED' },
  { label: 'Hediye çeki', type: 'GIFT_VOUCHER' },
];

export function PaymentScreen() {
  const navigation = useNavigation<Navigation>();
  const checkout = useCartStore((state) => state.checkout);
  const totalCents = useCartStore((state) => state.totalCents);
  const items = useCartStore((state) => state.items);
  const [selected, setSelected] = useState<PayMode>('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [cashPart, setCashPart] = useState('');
  const [cardPart, setCardPart] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherBalanceCents, setVoucherBalanceCents] = useState<number | null>(null);
  const [voucherNormCode, setVoucherNormCode] = useState<string | null>(null);
  const [remMethod, setRemMethod] = useState<'CASH' | 'CREDIT_CARD'>('CASH');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cashReceivedCents = toCents(cashReceived);
  const changeCents = useMemo(
    () => Math.max(0, cashReceivedCents - totalCents),
    [cashReceivedCents, totalCents],
  );
  const mixedTotalCents = toCents(cashPart) + toCents(cardPart);

  const voucherAppliedCents = useMemo(() => {
    if (voucherBalanceCents == null) return 0;
    return Math.min(voucherBalanceCents, totalCents);
  }, [voucherBalanceCents, totalCents]);

  const remainderAfterVoucher = Math.max(0, totalCents - voucherAppliedCents);

  const validateVoucher = async () => {
    setError(null);
    const code = voucherCode.trim();
    if (!code) {
      setError('Çek kodu girin');
      return;
    }
    try {
      const res = await api.get<{ currentBalance: string; code: string }>('/gift-vouchers/lookup', {
        params: { code },
      });
      const bal = toCents(res.data.currentBalance);
      setVoucherBalanceCents(bal);
      setVoucherNormCode(res.data.code);
      if (bal < totalCents) {
        setError('Bilgi: Çek bakiyesi sepetten düşük — kalan başka ödeme ile tamamlanmalı');
      }
    } catch (e) {
      setVoucherBalanceCents(null);
      setVoucherNormCode(null);
      setError(getApiErrorMessage(e, 'Çek doğrulanamadı'));
    }
  };

  const submit = async () => {
    if (loading) return;
    if (items.length === 0) {
      setError('Boş sepet için ödeme alınamaz');
      return;
    }

    let payments: CheckoutPayment[];

    if (selected === 'GIFT_VOUCHER') {
      if (!voucherNormCode || voucherBalanceCents == null || voucherAppliedCents <= 0) {
        setError('Geçerli hediye çeki doğrulayın');
        return;
      }
      payments = [
        {
          type: 'GIFT_VOUCHER',
          amount: centsToNumber(voucherAppliedCents),
          reference: voucherNormCode,
        },
      ];
      if (remainderAfterVoucher > 0) {
        if (remMethod === 'CASH') {
          if (cashReceivedCents < remainderAfterVoucher) {
            setError('Kalan tutar için yeterli nakit girilmedi');
            return;
          }
          payments.push({ type: 'CASH', amount: centsToNumber(remainderAfterVoucher) });
        } else {
          payments.push({ type: 'CREDIT_CARD', amount: centsToNumber(remainderAfterVoucher) });
        }
      }
    } else {
      if (selected === 'CASH' && cashReceivedCents < totalCents) {
        setError('Verilen para toplam tutardan düşük');
        return;
      }
      if (selected === 'MIXED' && mixedTotalCents !== totalCents) {
        setError('Karma ödeme toplamı satış tutarıyla eşleşmeli');
        return;
      }
      payments =
        selected === 'MIXED'
          ? [
              ...(toCents(cashPart) > 0 ? [{ type: 'CASH' as const, amount: centsToNumber(toCents(cashPart)) }] : []),
              ...(toCents(cardPart) > 0
                ? [{ type: 'CREDIT_CARD' as const, amount: centsToNumber(toCents(cardPart)) }]
                : []),
            ]
          : [{ type: selected as PaymentType, amount: centsToNumber(totalCents) }];
    }

    setLoading(true);
    setError(null);
    const result = await checkout(payments);
    setLoading(false);
    if (result.success && result.orderId) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace('Receipt', { orderId: result.orderId });
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setError(result.error ?? 'Satış tamamlanamadı');
  };

  const changeForVoucherCash =
    selected === 'GIFT_VOUCHER' && remMethod === 'CASH'
      ? Math.max(0, cashReceivedCents - remainderAfterVoucher)
      : changeCents;

  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Ödenecek tutar</Text>
      <Text style={styles.total}>{formatCurrencyFromCents(totalCents)}</Text>

      <View style={styles.methodGrid}>
        {methods.map((method) => (
          <Pressable
            key={method.label}
            onPress={() => setSelected(method.type)}
            style={[
              styles.method,
              selected === method.type && styles.methodSelected,
            ]}
          >
            <Text style={styles.methodText}>{method.label}</Text>
          </Pressable>
        ))}
      </View>

      {selected === 'GIFT_VOUCHER' ? (
        <View style={styles.section}>
          <Text style={styles.label}>Çek kodu</Text>
          <TextInput
            autoCapitalize="characters"
            onChangeText={setVoucherCode}
            placeholder="Kod"
            style={styles.input}
            value={voucherCode}
          />
          <Pressable onPress={() => void validateVoucher()} style={styles.secondary}>
            <Text style={styles.secondaryText}>Doğrula</Text>
          </Pressable>
          {voucherBalanceCents != null ? (
            <Text style={styles.change}>
              Kalan bakiye: {formatCurrencyFromCents(voucherBalanceCents)} · Bu satışa:{' '}
              {formatCurrencyFromCents(voucherAppliedCents)}
            </Text>
          ) : null}
          {remainderAfterVoucher > 0 ? (
            <>
              <Text style={styles.label}>Kalan {formatCurrencyFromCents(remainderAfterVoucher)} için</Text>
              <View style={styles.methodGrid}>
                <Pressable
                  onPress={() => setRemMethod('CASH')}
                  style={[styles.method, remMethod === 'CASH' && styles.methodSelected]}
                >
                  <Text style={styles.methodText}>Nakit</Text>
                </Pressable>
                <Pressable
                  onPress={() => setRemMethod('CREDIT_CARD')}
                  style={[styles.method, remMethod === 'CREDIT_CARD' && styles.methodSelected]}
                >
                  <Text style={styles.methodText}>Kart</Text>
                </Pressable>
              </View>
              {remMethod === 'CASH' ? (
                <>
                  <Text style={styles.label}>Verilen (kalan tutar için)</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    onChangeText={setCashReceived}
                    placeholder="0.00"
                    style={styles.input}
                    value={cashReceived}
                  />
                  <Text style={styles.change}>Para üstü: {formatCurrencyFromCents(changeForVoucherCash)}</Text>
                </>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}

      {selected === 'CASH' ? (
        <View style={styles.section}>
          <Text style={styles.label}>Verilen para</Text>
          <TextInput keyboardType="decimal-pad" onChangeText={setCashReceived} placeholder="0.00" style={styles.input} value={cashReceived} />
          <Text style={styles.change}>Para üstü: {formatCurrencyFromCents(changeCents)}</Text>
        </View>
      ) : null}

      {selected === 'MIXED' ? (
        <View style={styles.section}>
          <Text style={styles.label}>Nakit tutar</Text>
          <TextInput keyboardType="decimal-pad" onChangeText={setCashPart} placeholder="0.00" style={styles.input} value={cashPart} />
          <Text style={styles.label}>Kart tutar</Text>
          <TextInput keyboardType="decimal-pad" onChangeText={setCardPart} placeholder="0.00" style={styles.input} value={cardPart} />
          <Text style={styles.change}>Girilen toplam: {formatCurrencyFromCents(mixedTotalCents)}</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable disabled={loading} onPress={() => void submit()} style={[styles.submit, loading && styles.disabled]}>
        <Text style={styles.submitText}>{loading ? 'Kaydediliyor...' : 'Satışı Tamamla'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  change: {
    color: '#16a34a',
    fontSize: 16,
    fontWeight: '900',
  },
  container: {
    backgroundColor: '#f8fafc',
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 16,
  },
  disabled: {
    opacity: 0.6,
  },
  error: {
    color: '#dc2626',
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    paddingHorizontal: 12,
  },
  label: {
    color: '#64748b',
    fontWeight: '700',
  },
  method: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 14,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: '45%',
    height: 54,
    justifyContent: 'center',
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodSelected: {
    backgroundColor: '#eef2ff',
    borderColor: '#4f46e5',
  },
  methodText: {
    color: '#0f172a',
    fontWeight: '900',
  },
  secondary: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryText: { color: '#fff', fontWeight: '800' },
  section: {
    gap: 8,
  },
  submit: {
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  total: {
    color: '#0f172a',
    fontSize: 34,
    fontWeight: '900',
  },
});
