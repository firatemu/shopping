import { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage, publicFileUrl } from '../../lib/api';
import { formatCurrency } from '../../lib/money';
import { useCartStore } from '../../stores/cart.store';
import type { AppStackParamList } from '../../types/navigation';
import type { Product } from '../../types/product';

type Route = RouteProp<AppStackParamList, 'ProductDetail'>;

export function ProductDetailScreen() {
  const route = useRoute<Route>();
  const addItem = useCartStore((state) => state.addItem);
  const query = useQuery({
    queryFn: async () => {
      const response = await api.get<Product>(`/products/${route.params.productId}`);
      return response.data;
    },
    queryKey: ['product-detail', route.params.productId],
    staleTime: 5 * 60 * 1000,
  });

  const totalStock = useMemo(
    () => query.data?.variants?.reduce((sum, variant) => sum + variant.stockQuantity, 0) ?? 0,
    [query.data],
  );

  if (query.isLoading) return <ScreenState loading title="Ürün yükleniyor" />;
  if (query.isError) {
    return <ScreenState tone="error" title="Ürün yüklenemedi" description={getApiErrorMessage(query.error)} />;
  }
  if (!query.data) return <ScreenState title="Ürün bulunamadı" />;

  const product = query.data;
  const imageUrl = publicFileUrl(product.imageUrl);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} /> : <Text style={styles.imageText}>Görsel yok</Text>}
      </View>
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.meta}>{product.brand ?? 'Marka yok'} · {product.category ?? 'Kategori yok'}</Text>
      <Text style={styles.price}>{formatCurrency(product.salePrice)}</Text>
      <Text style={styles.stock}>Toplam stok: {totalStock}</Text>

      <Text style={styles.sectionTitle}>Varyasyonlar</Text>
      {product.variants?.length ? (
        product.variants.map((variant) => (
          <View key={variant.id} style={styles.variant}>
            <View>
              <Text style={styles.variantTitle}>{variant.color ?? '-'} / {variant.size ?? '-'}</Text>
              <Text style={styles.barcode}>{variant.barcode}</Text>
              <Text style={styles.stock}>Stok: {variant.stockQuantity}</Text>
            </View>
            <Pressable
              disabled={variant.stockQuantity <= 0}
              onPress={() =>
                addItem({
                  barcode: variant.barcode,
                  brand: product.brand,
                  category: product.category,
                  kdvRate: product.kdvRate,
                  name: `${product.name} - ${variant.color ?? ''}/${variant.size ?? ''}`,
                  price: variant.salePrice ?? product.salePrice,
                  productId: product.id,
                  stockQuantity: variant.stockQuantity,
                  variantId: variant.id,
                })
              }
              style={[styles.addButton, variant.stockQuantity <= 0 && styles.disabled]}
            >
              <Text style={styles.addText}>Sepete ekle</Text>
            </Pressable>
          </View>
        ))
      ) : (
        <ScreenState title="Varyasyon yok" description="Bu ürün için barkodlu varyasyon bulunamadı." />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  addText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  barcode: {
    color: '#64748b',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  container: {
    backgroundColor: '#f8fafc',
    flex: 1,
  },
  content: {
    gap: 12,
    padding: 16,
  },
  disabled: {
    opacity: 0.4,
  },
  hero: {
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 20,
    height: 220,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  imageText: {
    color: '#4f46e5',
    fontWeight: '800',
  },
  meta: {
    color: '#64748b',
    fontSize: 14,
  },
  name: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '900',
  },
  price: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 12,
  },
  stock: {
    color: '#16a34a',
    fontWeight: '700',
  },
  variant: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  variantTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
});
