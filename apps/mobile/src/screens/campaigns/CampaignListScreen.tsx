import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';
import type { AppStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<AppStackParamList>;

type CampaignRow = {
  id: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  uiStatus: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  usageCount?: number;
};

type ListResp = { data: CampaignRow[] };

const typeLabel: Record<string, string> = {
  PERCENTAGE: 'Yüzde indirim',
  FIXED_AMOUNT: 'Tutar indirim',
  X_FOR_Y: 'X al Y öde',
  SECOND_ITEM: 'İkinci ürün',
  CATEGORY: 'Kategori / hediye',
};

export function CampaignListScreen() {
  const navigation = useNavigation<Nav>();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';
  const canToggle = ['STORE_MANAGER', 'TENANT_ADMIN', 'SUPER_ADMIN'].includes(role);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');

  const q = useQuery({
    queryKey: ['campaigns', filter],
    queryFn: async () => {
      const res = await api.get<ListResp>('/campaigns', {
        params: filter === 'active' ? { activeOnly: true } : undefined,
      });
      return res.data;
    },
  });

  const rows = useMemo(() => {
    const d = q.data?.data ?? [];
    if (filter === 'expired') return d.filter((c) => c.uiStatus === 'EXPIRED');
    if (filter === 'inactive') return d.filter((c) => c.uiStatus === 'INACTIVE');
    if (filter === 'active') return d.filter((c) => c.uiStatus === 'ACTIVE');
    return d;
  }, [q.data, filter]);

  const toggleMut = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.put(`/campaigns/${id}`, { isActive });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const onToggle = useCallback(
    (c: CampaignRow) => {
      if (!canToggle) {
        Alert.alert('Yetki', 'Kampanya durumunu yalnızca mağaza müdürü veya üstü değiştirebilir.');
        return;
      }
      Alert.alert('Kampanya', c.isActive ? 'Kampanyayı durdur?' : 'Kampanyayı aktifleştir?', [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Tamam',
          onPress: () => toggleMut.mutate({ id: c.id, isActive: !c.isActive }),
        },
      ]);
    },
    [canToggle, toggleMut],
  );

  if (q.isError && !q.data) {
    return <ScreenState tone="error" title="Kampanyalar" description={getApiErrorMessage(q.error)} />;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.tabs}>
        {(['all', 'active', 'inactive', 'expired'] as const).map((k) => (
          <Pressable key={k} onPress={() => setFilter(k)} style={[styles.tab, filter === k && styles.tabOn]}>
            <Text style={[styles.tabT, filter === k && styles.tabTon]}>
              {k === 'all' ? 'Tümü' : k === 'active' ? 'Aktif' : k === 'inactive' ? 'Pasif' : 'Süresi dolmuş'}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => void q.refetch()} />}
        renderItem={({ item }) => (
          <Swipeable
            renderRightActions={() =>
              canToggle ? (
                <Pressable onPress={() => onToggle(item)} style={styles.swipe}>
                  <Text style={styles.swipeT}>{item.isActive ? 'Durdur' : 'Aktif'}</Text>
                </Pressable>
              ) : null
            }
          >
            <Pressable
              onPress={() => navigation.navigate('CampaignDetail', { campaignId: item.id })}
              style={styles.card}
            >
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.meta}>{typeLabel[item.type] ?? item.type}</Text>
              <Text style={styles.meta}>
                {item.startDate.slice(0, 10)} → {item.endDate.slice(0, 10)}
              </Text>
              <Text style={styles.badge}>Durum: {item.uiStatus}</Text>
              <Text style={styles.meta}>Kullanım: {item.usageCount ?? 0}</Text>
            </Pressable>
          </Swipeable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { color: '#4338ca', fontWeight: '800', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    padding: 16,
  },
  meta: { color: '#64748b', marginTop: 2 },
  swipe: { backgroundColor: '#4f46e5', justifyContent: 'center', paddingHorizontal: 20 },
  swipeT: { color: '#fff', fontWeight: '900' },
  tab: {
    borderColor: '#cbd5e1',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabOn: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  tabT: { color: '#475569', fontSize: 12, fontWeight: '700' },
  tabTon: { color: '#fff' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  title: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  wrap: { backgroundColor: '#f8fafc', flex: 1 },
});
