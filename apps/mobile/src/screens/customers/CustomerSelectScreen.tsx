import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { ScreenState } from '../../components/ScreenState';
import { api, getApiErrorMessage } from '../../lib/api';
import { useCartStore } from '../../stores/cart.store';
import type { Customer, CustomerListResponse } from '../../types/customer';

function customerLabel(customer: Customer): string {
  return customer.companyName || [customer.name, customer.surname].filter(Boolean).join(' ');
}

export function CustomerSelectScreen() {
  const navigation = useNavigation();
  const setSelectedCustomer = useCartStore((state) => state.setSelectedCustomer);
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryFn: async () => {
      const response = await api.get<CustomerListResponse>('/customers', {
        params: { limit: 30, page: 1, search: search.trim() || undefined },
      });
      return response.data.data;
    },
    queryKey: ['customers', search.trim()],
    staleTime: 5 * 60 * 1000,
  });

  const selectCustomer = (customer: Customer | null) => {
    setSelectedCustomer(customer ? { id: customer.id, name: customerLabel(customer) } : null);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          onChangeText={setSearch}
          placeholder="İsim veya telefon ara..."
          style={styles.input}
          value={search}
        />
        <Pressable onPress={() => selectCustomer(null)} style={styles.guestButton}>
          <Text style={styles.guestText}>Misafir satış</Text>
        </Pressable>
      </View>

      {query.isLoading ? (
        <ScreenState loading title="Müşteriler yükleniyor" />
      ) : query.isError ? (
        <ScreenState tone="error" title="Müşteriler alınamadı" description={getApiErrorMessage(query.error)} />
      ) : !query.data?.length ? (
        <ScreenState title="Müşteri bulunamadı" description="Misafir satışla devam edebilirsiniz." />
      ) : (
        <FlatList
          data={query.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => selectCustomer(item)} style={styles.row}>
              <Text style={styles.name}>{customerLabel(item)}</Text>
              <Text style={styles.meta}>{item.phone ?? item.email ?? 'İletişim yok'}</Text>
            </Pressable>
          )}
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
  guestButton: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
  },
  guestText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    gap: 8,
    padding: 16,
  },
  input: {
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    paddingHorizontal: 12,
  },
  meta: {
    color: '#64748b',
    marginTop: 4,
  },
  name: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  row: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
  },
});
