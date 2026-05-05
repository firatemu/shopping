import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import axios from 'axios';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import { formatCurrency } from '../../lib/money';
import type { AppStackParamList } from '../../types/navigation';
import type { CashRegisterSession } from '../../types/cashRegister';

type Nav = NativeStackNavigationProp<AppStackParamList>;

function num(v: string | number | undefined | null): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

export function CashRegisterScreen() {
  const navigation = useNavigation<Nav>();

  const statusQuery = useQuery({
    queryFn: async () => {
      try {
        const res = await api.get<CashRegisterSession>('/cash-register/current');
        return { open: true as const, session: res.data };
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 404) {
          return { open: false as const, session: null };
        }
        throw e;
      }
    },
    queryKey: ['cash-register-current'],
    staleTime: 30_000,
  });

  const session = statusQuery.data?.session;
  const expectedCash = useMemo(() => {
    if (!session) return 0;
    return num(session.openingBalance) + num(session.totalCash);
  }, [session]);

  const openRegister = useCallback(() => {
    navigation.navigate('OpenCashRegister');
  }, [navigation]);

  const closeRegister = useCallback(() => {
    if (!session) return;
    navigation.navigate('CloseCashRegister', {
      expectedCash,
      sessionId: session.id,
    });
  }, [navigation, session, expectedCash]);

  const movement = useCallback(() => {
    if (!session) return;
    navigation.navigate('CashMovement', { sessionId: session.id });
  }, [navigation, session]);

  if (statusQuery.isLoading) {
    return <ScreenState loading title="Kasa durumu" />;
  }
  if (statusQuery.isError) {
    return <ScreenState tone="error" title="Kasa" description={getApiErrorMessage(statusQuery.error)} />;
  }

  if (!statusQuery.data?.open || !session) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Kasa kapalı</Text>
        <Text style={styles.sub}>Gün başı için kasayı açın.</Text>
        <Pressable onPress={openRegister} style={styles.primary}>
          <Text style={styles.primaryText}>Kasayı Aç</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.badge}>Açık</Text>
        <Text style={styles.row}>Açılış: {formatCurrency(session.openingBalance)}</Text>
        <Text style={styles.row}>Nakit hareket: {formatCurrency(session.totalCash)}</Text>
        <Text style={styles.row}>Kart (işlem): {formatCurrency(session.totalCard)}</Text>
        <Text style={styles.row}>Havale: {formatCurrency(session.totalTransfer)}</Text>
        <Text style={styles.row}>Satış adedi: {session.totalSales}</Text>
        <Text style={styles.highlight}>Beklenen nakit: {formatCurrency(expectedCash)}</Text>
      </View>

      <Pressable onPress={movement} style={styles.secondary}>
        <Text style={styles.secondaryText}>Para hareketi</Text>
      </Pressable>
      <Pressable onPress={closeRegister} style={styles.danger}>
        <Text style={styles.dangerText}>Gün sonu — Kasayı Kapat</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    color: '#166534',
    fontWeight: '800',
    marginBottom: 8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    margin: 16,
    padding: 16,
  },
  center: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  container: { backgroundColor: '#f8fafc', flex: 1, gap: 12, paddingTop: 8 },
  danger: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  dangerText: { color: '#fff', fontWeight: '900' },
  highlight: { fontSize: 18, fontWeight: '900', marginTop: 8 },
  primary: {
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    marginTop: 12,
    minWidth: 220,
  },
  primaryText: { color: '#fff', fontWeight: '900' },
  row: { color: '#334155', fontSize: 15 },
  secondary: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  secondaryText: { color: '#fff', fontWeight: '800' },
  sub: { color: '#64748b', textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '900' },
});
