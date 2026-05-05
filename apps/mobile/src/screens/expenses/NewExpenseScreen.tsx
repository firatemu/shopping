import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, getApiErrorMessage } from '../../lib/api';
import type { AppStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<AppStackParamList>;

type Cat = { id: string; name: string; kind: string };

export function NewExpenseScreen() {
  const navigation = useNavigation<Nav>();
  const qc = useQueryClient();
  const [kind, setKind] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('Kasa');
  const [date, setDate] = useState(() => new Date());
  const [showDt, setShowDt] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cats = useQuery({
    queryKey: ['expense-cats', kind],
    queryFn: async () => {
      const res = await api.get<Cat[]>('/expenses/categories', { params: { kind } });
      return res.data;
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      const amt = Number(amount.replace(',', '.'));
      if (!categoryId) throw new Error('Kategori seçin');
      if (!Number.isFinite(amt) || amt <= 0) throw new Error('Tutar geçersiz');
      await api.post('/expenses', {
        type: kind,
        categoryId,
        amount: amt,
        description: description.trim() || undefined,
        reference: reference.trim() || undefined,
        date: date.toISOString().slice(0, 10),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['expenses-list'] });
      void qc.invalidateQueries({ queryKey: ['expenses-summary'] });
      navigation.goBack();
    },
  });

  const pickerItems = useMemo(() => cats.data ?? [], [cats.data]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.kindRow}>
          <Pressable onPress={() => setKind('EXPENSE')} style={[styles.kind, kind === 'EXPENSE' && styles.kindOn]}>
            <Text style={styles.kindT}>Gider</Text>
          </Pressable>
          <Pressable onPress={() => setKind('INCOME')} style={[styles.kind, kind === 'INCOME' && styles.kindOn]}>
            <Text style={styles.kindT}>Gelir</Text>
          </Pressable>
        </View>
        <Text style={styles.label}>Kategori</Text>
        <View style={styles.catWrap}>
          {pickerItems.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setCategoryId(c.id)}
              style={[styles.cat, categoryId === c.id && styles.catOn]}
            >
              <Text style={styles.catT}>{c.name}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Tutar</Text>
        <TextInput keyboardType="decimal-pad" onChangeText={setAmount} style={styles.input} value={amount} />
        <Text style={styles.label}>Kaynak (Kasa / Banka / Diğer)</Text>
        <TextInput onChangeText={setReference} style={styles.input} value={reference} />
        <Text style={styles.label}>Açıklama</Text>
        <TextInput multiline onChangeText={setDescription} style={[styles.input, { height: 72 }]} value={description} />
        <Pressable onPress={() => setShowDt(true)} style={styles.input}>
          <Text>Tarih: {date.toISOString().slice(0, 10)}</Text>
        </Pressable>
        {showDt ? (
          <DateTimePicker
            display="default"
            mode="date"
            value={date}
            onChange={(_: DateTimePickerEvent, d?: Date) => {
              setShowDt(Platform.OS === 'ios');
              if (d) setDate(d);
            }}
          />
        ) : null}
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <Pressable
          onPress={() => {
            setErr(null);
            mut.mutate(undefined, {
              onError: (e) => setErr(getApiErrorMessage(e)),
            });
          }}
          style={styles.btn}
        >
          <Text style={styles.btnT}>Kaydet</Text>
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
  cat: {
    borderColor: '#cbd5e1',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  catOn: { backgroundColor: '#eef2ff', borderColor: '#4f46e5' },
  catT: { color: '#0f172a', fontWeight: '700' },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
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
  kind: {
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  kindOn: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  kindRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  kindT: { color: '#0f172a', fontWeight: '800', textAlign: 'center' },
  label: { color: '#64748b', fontSize: 12, fontWeight: '700', marginBottom: 4 },
});
