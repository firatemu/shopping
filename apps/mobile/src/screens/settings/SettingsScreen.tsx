import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenState } from '../../components/ScreenState';
import { useAuthStore } from '../../stores/auth.store';
import type { AppStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<AppStackParamList>;

const appVersion =
  Constants.expoConfig?.version ??
  (typeof Constants.nativeAppVersion === 'string' ? Constants.nativeAppVersion : null) ??
  '—';

function MenuRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.menuRow}>
      <Text style={styles.menuText}>{label}</Text>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((state) => state.user);
  const tenantId = useAuthStore((state) => state.tenantId);
  const logout = useAuthStore((state) => state.logout);

  if (!user) {
    return <ScreenState tone="error" title="Oturum bilgisi bulunamadı" description="Lütfen yeniden giriş yapın." />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Ayarlar</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Kullanıcı</Text>
        <Text style={styles.value}>
          {user.firstName} {user.lastName}
        </Text>
        <Text style={styles.muted}>{user.email}</Text>
        <Text style={styles.roleHint}>Profil düzenleme web panelinden yapılır.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Mağaza (tenant)</Text>
        <Text style={styles.value}>Kimlik</Text>
        <Text style={styles.muted} selectable>
          {tenantId ?? '—'}
        </Text>
        <Text style={styles.roleHint}>
          Mağaza adı ve abonelik bilgisi şu an yalnızca web üzerinden görüntülenebilir.
        </Text>
      </View>

      <Text style={styles.section}>Raporlar</Text>
      <View style={styles.card}>
        <MenuRow label="Dashboard" onPress={() => navigation.navigate('Dashboard')} />
        <MenuRow label="Satış raporu" onPress={() => navigation.navigate('SalesReport')} />
        <MenuRow label="Stok raporu" onPress={() => navigation.navigate('StockReport')} />
        <MenuRow label="Kasa raporu" onPress={() => navigation.navigate('CashReport')} />
      </View>

      <Text style={styles.section}>İşlemler</Text>
      <View style={styles.card}>
        <MenuRow label="Kampanyalar" onPress={() => navigation.navigate('CampaignList')} />
        <MenuRow label="Hediye çekleri" onPress={() => navigation.navigate('GiftVoucherList')} />
        <MenuRow label="Gelir-gider" onPress={() => navigation.navigate('ExpenseList')} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Güvenlik</Text>
        <Text style={styles.roleHint}>
          SSL pinning üretimde native katmanda değerlendirilmelidir. Root/jailbreak tespiti için cihaz üreticisi
          politikalarına uygun ek modüller gerekebilir (expo-device yalnızca cihaz bilgisi sağlar).
        </Text>
        <Text style={styles.muted}>
          Cihaz: {Device.brand ?? '—'} {Device.modelName ?? ''}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Uygulama</Text>
        <Text style={styles.value}>Sürüm {appVersion}</Text>
      </View>

      <Pressable accessibilityRole="button" onPress={logout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    marginBottom: 12,
    overflow: 'hidden',
    padding: 16,
  },
  chev: { color: '#94a3b8', fontSize: 20, fontWeight: '700' },
  container: {
    backgroundColor: '#f8fafc',
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    marginTop: 8,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  menuRow: {
    alignItems: 'center',
    borderBottomColor: '#f1f5f9',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  menuText: { color: '#0f172a', fontSize: 16, fontWeight: '700' },
  muted: {
    color: '#64748b',
    fontSize: 14,
  },
  roleHint: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 8,
  },
  section: { color: '#334155', fontSize: 14, fontWeight: '800', marginBottom: 8, marginTop: 8 },
  title: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
  },
  value: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
});
