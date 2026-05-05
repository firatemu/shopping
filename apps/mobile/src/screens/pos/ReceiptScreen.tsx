import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import { useCartStore } from '../../stores/cart.store';
import type { AppStackParamList } from '../../types/navigation';
import type { ReceiptResponse } from '../../types/sales';

type Route = RouteProp<AppStackParamList, 'Receipt'>;
type Navigation = NativeStackNavigationProp<AppStackParamList>;

export function ReceiptScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Navigation>();
  const clearCart = useCartStore((state) => state.clearCart);
  const query = useQuery({
    queryFn: async () => {
      const response = await api.get<ReceiptResponse>(`/receipts/${route.params.orderId}`);
      return response.data;
    },
    queryKey: ['receipt', route.params.orderId],
    staleTime: 60 * 1000,
  });

  const newSale = () => {
    clearCart();
    navigation.navigate('Tabs');
  };

  if (query.isLoading) return <ScreenState loading title="Fiş hazırlanıyor" />;
  if (query.isError) return <ScreenState tone="error" title="Fiş alınamadı" description={getApiErrorMessage(query.error)} />;
  if (!query.data) return <ScreenState title="Fiş bulunamadı" />;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Fiş No: {query.data.orderNumber}</Text>
        <Text style={styles.generatedAt}>{new Date(query.data.generatedAt).toLocaleString('tr-TR')}</Text>
        <View style={styles.receiptBox}>
          <Text style={styles.receiptText}>{query.data.textReceipt}</Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable disabled style={[styles.printButton, styles.disabled]}>
          <Text style={styles.printText}>Yazdır (Sprint 3)</Text>
        </Pressable>
        <Pressable onPress={newSale} style={styles.newButton}>
          <Text style={styles.newText}>Yeni Satış</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    flex: 1,
  },
  content: {
    gap: 12,
    padding: 16,
  },
  disabled: {
    opacity: 0.45,
  },
  footer: {
    backgroundColor: '#ffffff',
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 16,
  },
  generatedAt: {
    color: '#64748b',
    textAlign: 'center',
  },
  newButton: {
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  newText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  printButton: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  printText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  receiptBox: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  receiptText: {
    color: '#0f172a',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 19,
  },
  title: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
});
