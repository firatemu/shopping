import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { publicFileUrl } from '../lib/api';
import { formatCurrency } from '../lib/money';
import type { Product } from '../types/product';

type ProductCardProps = {
  product: Product;
  onPress: () => void;
};

export function ProductCard({ product, onPress }: ProductCardProps) {
  const firstVariant = product.variants?.[0];
  const stock = product.totalStock ?? product.variants?.reduce((sum, v) => sum + v.stockQuantity, 0) ?? 0;
  const imageUrl = publicFileUrl(product.imageUrl);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.imageBox}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} /> : <Text style={styles.imageText}>Ürün</Text>}
      </View>
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.name}>{product.name}</Text>
        <Text numberOfLines={1} style={styles.meta}>{product.brand ?? 'Marka yok'} · {product.category ?? 'Kategori yok'}</Text>
        <Text style={styles.barcode}>Barkod: {firstVariant?.barcode ?? '-'}</Text>
        <View style={styles.row}>
          <Text style={styles.stock}>Stok: {stock}</Text>
          <Text style={styles.price}>{formatCurrency(firstVariant?.salePrice ?? product.salePrice)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  barcode: {
    color: '#64748b',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  imageBox: {
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    height: 72,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 72,
  },
  imageText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '700',
  },
  meta: {
    color: '#64748b',
    fontSize: 13,
  },
  name: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
  },
  price: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stock: {
    color: '#16a34a',
    fontSize: 13,
    fontWeight: '700',
  },
});
