import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getApiErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';

export function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = identifier.trim() !== '' && password.trim() !== '' && !loading;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await login({
        identifier: identifier.trim(),
        password,
        tenantId: tenantId.trim() || undefined,
      });
      setSuccess('Giriş başarılı.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Giriş yapılamadı'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.brand}>SoftShopping</Text>
        <Text style={styles.title}>Kurumsal Giriş</Text>
        <Text style={styles.subtitle}>Satış ve stok yönetimine başlamak için hesabınızla giriş yapın.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>E-posta veya kullanıcı adı</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setIdentifier}
            placeholder="info@azemyazilim.com"
            style={styles.input}
            value={identifier}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Şifre</Text>
          <TextInput
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            style={styles.input}
            value={password}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Tenant ID (opsiyonel)</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setTenantId}
            placeholder="Varsayılan tenant için boş bırakın"
            style={styles.input}
            value={tenantId}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={handleLogin}
          style={({ pressed }) => [
            styles.button,
            (!canSubmit || pressed) && styles.buttonDisabled,
          ]}
        >
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Giriş Yap</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  brand: {
    color: '#4f46e5',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    gap: 16,
    padding: 24,
    width: '100%',
  },
  container: {
    backgroundColor: '#0f172a',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
    lineHeight: 18,
  },
  field: {
    gap: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 15,
    height: 46,
    paddingHorizontal: 12,
  },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  success: {
    color: '#16a34a',
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
});
