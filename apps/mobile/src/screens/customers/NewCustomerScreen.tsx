import { ScrollView, StyleSheet, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, getApiErrorMessage } from '../../lib/api';
import { isValidTurkeyMobile, normalizeTurkeyPhone } from '../../lib/phone';
import type { AppStackParamList } from '../../types/navigation';
import type { Customer } from '../../types/customer';
import { useState } from 'react';

const schema = z.object({
  address: z.string().optional(),
  birthDate: z.string().optional(),
  email: z.string().optional(),
  name: z.string().min(1, 'İsim gerekli'),
  phone: z.string().min(1, 'Telefon gerekli'),
  taxId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Nav = NativeStackNavigationProp<AppStackParamList>;

export function NewCustomerScreen() {
  const navigation = useNavigation<Nav>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      address: '',
      birthDate: '',
      email: '',
      name: '',
      phone: '',
      taxId: '',
    },
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (values) => {
    const e164 = normalizeTurkeyPhone(values.phone);
    if (!isValidTurkeyMobile(e164)) {
      setError('Geçerli bir cep telefonu girin (+90 5XXXXXXXXX)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        address: values.address || undefined,
        birthDate: values.birthDate || undefined,
        name: values.name,
        phone: e164,
        taxId: values.taxId || undefined,
      };
      if (values.email?.trim()) {
        payload.email = values.email.trim();
      }
      const res = await api.post<Customer>('/customers', payload);
      navigation.replace('CustomerDetail', { customerId: res.data.id });
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Yeni müşteri</Text>

      <Text style={styles.label}>İsim *</Text>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, value } }) => (
          <TextInput onChangeText={onChange} style={styles.input} value={value} />
        )}
      />
      {errors.name ? <Text style={styles.fieldErr}>{errors.name.message}</Text> : null}

      <Text style={styles.label}>Telefon * (+90)</Text>
      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, value } }) => (
          <TextInput
            keyboardType="phone-pad"
            onChangeText={onChange}
            placeholder="5XX XXX XX XX"
            style={styles.input}
            value={value}
          />
        )}
      />
      {errors.phone ? <Text style={styles.fieldErr}>{errors.phone.message}</Text> : null}

      <Text style={styles.label}>E-posta</Text>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={onChange}
            style={styles.input}
            value={value}
          />
        )}
      />
      {errors.name ? <Text style={styles.fieldErr}>{errors.name.message}</Text> : null}

      <Text style={styles.label}>Adres</Text>
      <Controller
        control={control}
        name="address"
        render={({ field: { onChange, value } }) => (
          <TextInput multiline onChangeText={onChange} style={[styles.input, styles.multi]} value={value} />
        )}
      />

      <Text style={styles.label}>Doğum tarihi (YYYY-MM-DD)</Text>
      <Controller
        control={control}
        name="birthDate"
        render={({ field: { onChange, value } }) => (
          <TextInput onChangeText={onChange} placeholder="1990-05-15" style={styles.input} value={value} />
        )}
      />

      <Text style={styles.label}>TC / Vergi no</Text>
      <Controller
        control={control}
        name="taxId"
        render={({ field: { onChange, value } }) => (
          <TextInput onChangeText={onChange} style={styles.input} value={value} />
        )}
      />

      {error ? <Text style={styles.err}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color="#4f46e5" style={{ marginTop: 16 }} />
      ) : (
        <Pressable onPress={() => void onSubmit()} style={styles.btn}>
          <Text style={styles.btnText}>Kaydet</Text>
        </Pressable>
      )}
    </ScrollView>
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
  container: { backgroundColor: '#f8fafc', flex: 1 },
  content: { padding: 16 },
  err: { color: '#dc2626', marginTop: 8 },
  fieldErr: { color: '#dc2626', fontSize: 12 },
  input: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  label: { color: '#64748b', fontWeight: '700', marginBottom: 4 },
  multi: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 16 },
});
