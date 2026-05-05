import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RouteProp, useRoute } from '@react-navigation/native';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';
import type { AppStackParamList } from '../../types/navigation';

type R = RouteProp<AppStackParamList, 'CampaignDetail'>;

export function CampaignDetailScreen() {
  const { params } = useRoute<R>();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';
  const canToggle = ['STORE_MANAGER', 'TENANT_ADMIN', 'SUPER_ADMIN'].includes(role);

  const q = useQuery({
    queryKey: ['campaign', params.campaignId],
    queryFn: async () => {
      const res = await api.get(`/campaigns/${params.campaignId}`);
      return res.data as Record<string, unknown>;
    },
  });

  const mut = useMutation({
    mutationFn: async (isActive: boolean) => {
      await api.put(`/campaigns/${params.campaignId}`, { isActive });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['campaign', params.campaignId] });
      void qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  const rules = useMemo(() => {
    const r = q.data?.rules;
    return r && typeof r === 'object' ? (r as Record<string, unknown>) : {};
  }, [q.data]);

  if (q.isLoading && !q.data) return <ScreenState loading title="Kampanya" />;
  if (q.isError && !q.data) {
    return <ScreenState tone="error" title="Kampanya" description={getApiErrorMessage(q.error)} />;
  }

  const c = q.data!;
  const name = String(c.name ?? '');
  const type = String(c.type ?? '');
  const active = Boolean(c.isActive);

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <Text style={styles.h1}>{name}</Text>
      <Text style={styles.meta}>Tip: {type}</Text>
      <Text style={styles.meta}>
        {String(c.startDate ?? '').slice(0, 10)} → {String(c.endDate ?? '').slice(0, 10)}
      </Text>
      <Text style={styles.meta}>Durum (UI): {String(c.uiStatus ?? '')}</Text>
      <Text style={styles.meta}>Kullanım: {String(c.usageCount ?? 0)}</Text>
      <Text style={styles.meta}>Toplam indirim: {String(c.totalDiscountGiven ?? '0')}</Text>
      <Text style={styles.h2}>Kurallar</Text>
      <Text style={styles.code}>{JSON.stringify(rules, null, 2)}</Text>

      {canToggle ? (
        <Pressable
          onPress={() => {
            Alert.alert('Onay', active ? 'Kampanyayı durdur?' : 'Aktifleştir?', [
              { text: 'İptal', style: 'cancel' },
              { text: 'Tamam', onPress: () => mut.mutate(!active) },
            ]);
          }}
          style={styles.btn}
        >
          <Text style={styles.btnT}>{active ? 'Pasif yap' : 'Aktif yap'}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    marginTop: 24,
    padding: 16,
  },
  btnT: { color: '#fff', fontWeight: '900' },
  code: { color: '#334155', fontFamily: 'monospace', fontSize: 12 },
  content: { padding: 16, paddingBottom: 40 },
  h1: { color: '#0f172a', fontSize: 22, fontWeight: '900' },
  h2: { color: '#334155', fontSize: 16, fontWeight: '900', marginTop: 16 },
  meta: { color: '#64748b', marginTop: 4 },
  screen: { backgroundColor: '#f8fafc', flex: 1 },
});
