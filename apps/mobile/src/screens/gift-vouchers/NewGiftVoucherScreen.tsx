import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, getApiErrorMessage } from '../../lib/api';

import type { AppStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<AppStackParamList>;

export function NewGiftVoucherScreen() {
  const navigation = useNavigation<Nav>();
  const [amount, setAmount] = useState('');
  const [code, setCode] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [exp, setExp] = useState<Date | undefined>();
  const [showDt, setShowDt] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(null);
    const amt = Number(amount.replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr('Geçerli tutar girin');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/gift-vouchers', {
        amount: amt,
        code: code.trim() || undefined,
        companyName: company.trim() || undefined,
        notes: notes.trim() || undefined,
        expiresAt: exp ? exp.toISOString().slice(0, 10) : undefined,
      });
      const id = (res.data as { id: string }).id;
      navigation.navigate('GiftVoucherDetail', { voucherId: id });
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Tutar (TL)</Text>
        <TextInput keyboardType="decimal-pad" onChangeText={setAmount} style={styles.input} value={amount} />
        <Text style={styles.label}>Özel kod (boş = otomatik)</Text>
        <TextInput autoCapitalize="characters" onChangeText={setCode} style={styles.input} value={code} />
        <Text style={styles.label}>Firma (opsiyonel)</Text>
        <TextInput onChangeText={setCompany} style={styles.input} value={company} />
        <Text style={styles.label}>Not</Text>
        <TextInput multiline onChangeText={setNotes} style={[styles.input, { height: 80 }]} value={notes} />
        <Pressable onPress={() => setShowDt(true)} style={styles.input}>
          <Text style={styles.label}>Son kullanma: {exp ? exp.toISOString().slice(0, 10) : 'Seçilmedi'}</Text>
        </Pressable>
        {showDt ? (
          <DateTimePicker
            display="default"
            mode="date"
            value={exp ?? new Date()}
            onChange={(_: DateTimePickerEvent, d?: Date) => {
              setShowDt(Platform.OS === 'ios');
              if (d) setExp(d);
            }}
          />
        ) : null}
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <Pressable disabled={loading} onPress={() => void submit()} style={styles.btn}>
          <Text style={styles.btnT}>{loading ? '…' : 'Oluştur'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    marginTop: 20,
    padding: 16,
  },
  btnT: { color: '#fff', fontWeight: '900' },
  content: { padding: 16 },
  err: { color: '#dc2626', fontWeight: '700', marginTop: 8 },
  input: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  label: { color: '#64748b', fontSize: 12, fontWeight: '700', marginBottom: 4 },
});
