import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import { formatCurrencyFromCents, toCents } from '../../lib/money';
import type { AppStackParamList } from '../../types/navigation';

type Route = RouteProp<AppStackParamList, 'CloseCashRegister'>;

export function CloseCashRegisterScreen() {
  const { params } = useRoute<Route>();
  const navigation = useNavigation();
  const qc = useQueryClient();
  const expectedCents = Math.round(params.expectedCash * 100);

  const [counts, setCounts] = useState<Record<number, string>>({
    10: '',
    20: '',
    50: '',
    100: '',
    200: '',
  });
  const [coins, setCoins] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const billTotalCents = useMemo(() => {
    let sum = 0;
    for (const denom of [200, 100, 50, 20, 10]) {
      const n = Number.parseInt(counts[denom] || '0', 10);
      if (Number.isFinite(n) && n >= 0) sum += denom * 100 * n;
    }
    return sum;
  }, [counts]);

  const coinsCents = toCents(coins);
  const physicalCents = billTotalCents + coinsCents;
  const diffCents = physicalCents - expectedCents;

  const submit = () => {
    if (!note.trim()) {
      setErr('Kapanış notu zorunludur.');
      return;
    }

    Alert.alert(
      'Kasayı kapat',
      'Bu işlem geri alınamaz. Onaylıyor musunuz?',
      [
        { style: 'cancel', text: 'Vazgeç' },
        {
          text: 'Kapat',
          style: 'destructive',
          onPress: () => void doClose(),
        },
      ],
    );
  };

  const doClose = async () => {
    setLoading(true);
    setErr(null);
    try {
      await api.post(`/cash-register/${params.sessionId}/close`, {
        notes: note.trim(),
        physicalCount: physicalCents / 100,
      });
      await qc.invalidateQueries({ queryKey: ['cash-register-current'] });
      Alert.alert(
        'Kasa kapandı',
        `Sistem nakit: ${formatCurrencyFromCents(expectedCents)}\nSayım: ${formatCurrencyFromCents(physicalCents)}\nFark: ${formatCurrencyFromCents(diffCents)}`,
        [{ onPress: () => navigation.goBack(), text: 'Tamam' }],
      );
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Kasa kapanış</Text>
      <Text style={styles.expected}>
        Sistem nakit: {formatCurrencyFromCents(expectedCents)}
      </Text>

      {[200, 100, 50, 20, 10].map((denom) => (
        <View key={denom} style={styles.row}>
          <Text style={styles.denom}>{denom} TL ×</Text>
          <TextInput
            keyboardType="number-pad"
            onChangeText={(t) => setCounts((prev) => ({ ...prev, [denom]: t }))}
            placeholder="0"
            style={styles.countInput}
            value={counts[denom]}
          />
        </View>
      ))}

      <Text style={styles.label}>Bozuk para (TL)</Text>
      <TextInput keyboardType="decimal-pad" onChangeText={setCoins} style={styles.input} value={coins} />

      <Text style={styles.sum}>
        Sayım toplamı: {formatCurrencyFromCents(physicalCents)}
      </Text>
      <Text style={[styles.sum, Math.abs(diffCents) > 1 && styles.diff]}>
        Fark: {formatCurrencyFromCents(diffCents)}
      </Text>

      <Text style={styles.label}>Kapanış notu *</Text>
      <TextInput multiline onChangeText={setNote} style={[styles.input, styles.multi]} value={note} />

      {err ? <Text style={styles.err}>{err}</Text> : null}

      {loading ? (
        <ScreenState loading title="Kapatılıyor" />
      ) : (
        <Pressable onPress={submit} style={styles.btn}>
          <Text style={styles.btnText}>Kasayı Kapat</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    marginTop: 16,
  },
  btnText: { color: '#fff', fontWeight: '900' },
  content: { padding: 16, paddingBottom: 40 },
  countInput: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    height: 44,
    marginLeft: 12,
    paddingHorizontal: 12,
  },
  denom: { fontWeight: '800', width: 90 },
  diff: { color: '#dc2626', fontWeight: '900' },
  err: { color: '#dc2626', marginTop: 8 },
  expected: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  input: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  label: { color: '#64748b', fontWeight: '700', marginTop: 8 },
  multi: { height: 88, paddingTop: 12, textAlignVertical: 'top' },
  row: { alignItems: 'center', flexDirection: 'row', marginBottom: 8 },
  sum: { fontSize: 15, fontWeight: '800', marginTop: 6 },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  wrap: { backgroundColor: '#f8fafc', flex: 1 },
});
