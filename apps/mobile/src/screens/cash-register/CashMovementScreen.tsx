import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import { toCents } from '../../lib/money';
import type { AppStackParamList } from '../../types/navigation';

type Route = RouteProp<AppStackParamList, 'CashMovement'>;

export function CashMovementScreen() {
  const { params } = useRoute<Route>();
  const navigation = useNavigation();
  const qc = useQueryClient();
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const c = toCents(amount);
    if (c <= 0) {
      setErr('Tutar girin');
      return;
    }
    if (!description.trim()) {
      setErr('Açıklama girin');
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      await api.post(`/cash-register/${params.sessionId}/movement`, {
        amount: c / 100,
        description: description.trim(),
        type,
      });
      await qc.invalidateQueries({ queryKey: ['cash-register-current'] });
      navigation.goBack();
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Para hareketi</Text>

      <View style={styles.row}>
        <Pressable onPress={() => setType('IN')} style={[styles.chip, type === 'IN' && styles.chipOn]}>
          <Text style={styles.chipText}>Nakit giriş</Text>
        </Pressable>
        <Pressable onPress={() => setType('OUT')} style={[styles.chip, type === 'OUT' && styles.chipOn]}>
          <Text style={styles.chipText}>Nakit çıkış</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Tutar (TL)</Text>
      <TextInput keyboardType="decimal-pad" onChangeText={setAmount} style={styles.input} value={amount} />

      <Text style={styles.label}>Açıklama</Text>
      <TextInput multiline onChangeText={setDescription} style={[styles.input, styles.multi]} value={description} />

      {err ? <Text style={styles.err}>{err}</Text> : null}

      {loading ? <ScreenState loading title="Kaydediliyor" /> : null}
      {!loading ? (
        <Pressable onPress={() => void submit()} style={styles.btn}>
          <Text style={styles.btnText}>Kaydet</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  label: { color: '#64748b', fontWeight: '700' },
  multi: { height: 90, paddingTop: 12, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 16 },
  wrap: { backgroundColor: '#f8fafc', flex: 1, padding: 16 },
});
