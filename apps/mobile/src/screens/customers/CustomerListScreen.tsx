import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import { formatCurrency } from '../../lib/money';
import { useCartStore } from '../../stores/cart.store';
import type { AppStackParamList } from '../../types/navigation';
import type { CustomerListItem, CustomerListResponse } from '../../types/customer';

const PAGE_SIZE = 20;

type StackNav = NativeStackNavigationProp<AppStackParamList>;

function SkeletonList() {
  return (
    <View style={styles.skeletonWrap}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.skeletonRow}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonTextCol}>
            <View style={styles.skeletonLineWide} />
            <View style={styles.skeletonLineNarrow} />
          </View>
        </View>
      ))}
    </View>
  );
}

function CustomerRow({
  item,
  onPressDetail,
  onStartSale,
}: {
  item: CustomerListItem;
  onPressDetail: () => void;
  onStartSale: () => void;
}) {
  const label = item.companyName || [item.name, item.surname].filter(Boolean).join(' ');
  const spend = item.totalSpent ?? 0;
  const balance = item.currentBalance != null ? Number(item.currentBalance) : null;

  const renderLeft = useCallback(
    () => (
      <Pressable onPress={onStartSale} style={styles.swipeSale}>
        <Text style={styles.swipeSaleText}>Satış</Text>
      </Pressable>
    ),
    [onStartSale],
  );

  const renderRight = useCallback(
    () => (
      <Pressable onPress={onPressDetail} style={styles.swipeDetail}>
        <Text style={styles.swipeDetailText}>Detay</Text>
      </Pressable>
    ),
    [onPressDetail],
  );

  return (
    <Swipeable renderLeftActions={renderLeft} renderRightActions={renderRight}>
      <Pressable onPress={onPressDetail} style={styles.card}>
        <View style={styles.cardBody}>
          <Text numberOfLines={1} style={styles.cardTitle}>{label}</Text>
          <Text style={styles.cardMeta}>{item.phone ?? '—'}</Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardSpend}>Alışveriş: {formatCurrency(spend)}</Text>
            <Text style={[styles.cardBalance, balance != null && balance > 0 && styles.cardDebt]}>
              Bakiye: {balance == null ? '—' : formatCurrency(balance)}
            </Text>
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}

export function CustomerListScreen() {
  const navigation = useNavigation<StackNav>();
  const setCustomer = useCartStore((s) => s.setSelectedCustomer);
  const [search, setSearch] = useState('');

  const searchTrim = useMemo(() => search.trim(), [search]);

  const query = useInfiniteQuery({
    queryFn: async ({ pageParam }) => {
      const res = await api.get<CustomerListResponse>('/customers', {
        params: {
          page: pageParam,
          limit: PAGE_SIZE,
          search: searchTrim || undefined,
        },
      });
      return res.data;
    },
    getNextPageParam: (lastPage) => {
      const p = lastPage as CustomerListResponse;
      return p.meta.page < p.meta.totalPages ? p.meta.page + 1 : undefined;
    },
    initialPageParam: 1,
    queryKey: ['customers-list', searchTrim],
    staleTime: 2 * 60 * 1000,
  });

  const rows = query.data?.pages.flatMap((p) => (p as CustomerListResponse).data) ?? [];

  const goDetail = (id: string) => {
    navigation.navigate('CustomerDetail', { customerId: id });
  };

  const startSale = (c: CustomerListItem) => {
    const name = c.companyName || [c.name, c.surname].filter(Boolean).join(' ');
    setCustomer({ id: c.id, name });
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Tabs',
        params: { screen: 'POS' },
      }),
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          onChangeText={setSearch}
          placeholder="İsim, telefon veya TC / vergi no…"
          style={styles.search}
          value={search}
        />
        <Pressable onPress={() => navigation.navigate('NewCustomer')} style={styles.newBtn}>
          <Text style={styles.newBtnText}>+ Yeni</Text>
        </Pressable>
      </View>

      {query.isLoading ? (
        <SkeletonList />
      ) : query.isError ? (
        <ScreenState
          tone="error"
          title="Liste yüklenemedi"
          description={getApiErrorMessage(query.error)}
        />
      ) : rows.length === 0 ? (
        <ScreenState title="Müşteri yok" description="Arama kriterlerini değiştirin veya yeni müşteri ekleyin." />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
          onEndReachedThreshold={0.35}
          renderItem={({ item }) => (
            <CustomerRow
              item={item}
              onPressDetail={() => goDetail(item.id)}
              onStartSale={() => startSale(item)}
            />
          )}
          ListFooterComponent={
            query.isFetchingNextPage ? <ActivityIndicator style={styles.footer} color="#4f46e5" /> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardBalance: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  cardBody: { gap: 4 },
  cardDebt: { color: '#dc2626' },
  cardMeta: { color: '#64748b', fontSize: 13 },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardSpend: { color: '#0f172a', fontSize: 13, fontWeight: '700' },
  cardTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  container: { backgroundColor: '#f8fafc', flex: 1 },
  footer: { padding: 16 },
  header: {
    backgroundColor: '#fff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  newBtn: {
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  newBtnText: { color: '#fff', fontWeight: '800' },
  search: {
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
  },
  skeletonAvatar: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    height: 44,
    width: 44,
  },
  skeletonLineNarrow: {
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    height: 12,
    width: '50%',
  },
  skeletonLineWide: {
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    height: 14,
    width: '75%',
  },
  skeletonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  skeletonTextCol: { flex: 1, gap: 8 },
  skeletonWrap: { paddingTop: 12 },
  swipeDetail: {
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    marginVertical: 4,
    paddingHorizontal: 20,
  },
  swipeDetailText: { color: '#fff', fontWeight: '800' },
  swipeSale: {
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    marginVertical: 4,
    paddingHorizontal: 20,
  },
  swipeSaleText: { color: '#fff', fontWeight: '800' },
});
