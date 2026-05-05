import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import { toCents } from '../../lib/money';

export function OpenCashRegisterScreen() {
  const navigation = useNavigation();
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const c = toCents(amount);
    if (c < 0) {
      setErr('Geçerli tutar girin');
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      await api.post('/cash-register/open', {
        notes: notes.trim() || undefined,
        openingBalance: c / 100,
      });
      await qc.invalidateQueries({ queryKey: ['cash-register-current'] });
      navigation.goBack();
    } catch (e) {
      setErr(getApiErrorMessage(e, 'Kasa açılamadı'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Kasa açılış</Text>
      <Text style={styles.label}>Kasada sayılan nakit (TL)</Text>
      <TextInput keyboardType="decimal-pad" onChangeText={setAmount} style={styles.input} value={amount} />
      <Text style={styles.label}>Not (isteğe bağlı)</Text>
      <TextInput multiline onChangeText={setNotes} style={[styles.input, styles.multi]} value={notes} />
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {loading ? (
        <ScreenState loading title="Açılıyor" />
      ) : (
        <Pressable onPress={() => void submit()} style={styles.btn}>
          <Text style={styles.btnText}>Kasayı Aç</Text>
        </Pressable>
      )}
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
  multi: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 16 },
  wrap: { backgroundColor: '#f8fafc', flex: 1, padding: 16 },
});
