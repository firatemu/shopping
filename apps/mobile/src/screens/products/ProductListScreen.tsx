import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { ProductCard } from '../../components/ProductCard';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import type { AppStackParamList } from '../../types/navigation';
import type { Product, ProductListResponse } from '../../types/product';

type Navigation = NativeStackNavigationProp<AppStackParamList>;

const PAGE_SIZE = 20;

export function ProductListScreen() {
  const navigation = useNavigation<Navigation>();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const params = useMemo(
    () => ({ brand: brand.trim(), category: category.trim(), search: search.trim() }),
    [brand, category, search],
  );

  const query = useInfiniteQuery({
    getNextPageParam: (lastPage) => {
      const page = lastPage as ProductListResponse;
      return page.meta.page < page.meta.totalPages ? page.meta.page + 1 : undefined;
    },
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const response = await api.get<ProductListResponse>('/products', {
        params: {
          brand: params.brand || undefined,
          category: params.category || undefined,
          limit: PAGE_SIZE,
          page: pageParam,
          search: params.search || undefined,
        },
      });
      return response.data;
    },
    queryKey: ['products', params],
    staleTime: 5 * 60 * 1000,
  });

  const products = query.data?.pages.flatMap((page) => (page as ProductListResponse).data) ?? [];

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard product={item} onPress={() => navigation.navigate('ProductDetail', { productId: item.id })} />
  );

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <TextInput
          autoCapitalize="none"
          onChangeText={setSearch}
          placeholder="Ürün adı veya barkod ara..."
          style={styles.input}
          value={search}
        />
        <View style={styles.filterRow}>
          <TextInput onChangeText={setCategory} placeholder="Kategori" style={[styles.input, styles.filterInput]} value={category} />
          <TextInput onChangeText={setBrand} placeholder="Marka" style={[styles.input, styles.filterInput]} value={brand} />
        </View>
        <Pressable onPress={() => navigation.navigate('BarcodeScanner', { mode: 'lookup' })} style={styles.scanButton}>
          <Text style={styles.scanText}>Barkodla ara</Text>
        </Pressable>
      </View>

      {query.isLoading ? (
        <ScreenState loading title="Ürünler yükleniyor" description="Katalog hazırlanıyor..." />
      ) : query.isError ? (
        <ScreenState
          tone="error"
          title="Ürünler yüklenemedi"
          description={getApiErrorMessage(query.error, 'Ürün listesi alınamadı')}
        />
      ) : products.length === 0 ? (
        <ScreenState title="Ürün bulunamadı" description="Arama veya filtreleri değiştirip tekrar deneyin." />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          renderItem={renderProduct}
          ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color="#4f46e5" style={styles.footer} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    flex: 1,
  },
  filterInput: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filters: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    gap: 8,
    padding: 16,
  },
  footer: {
    padding: 16,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    paddingHorizontal: 12,
  },
  scanButton: {
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
  },
  scanText: {
    color: '#ffffff',
    fontWeight: '800',
  },
});
