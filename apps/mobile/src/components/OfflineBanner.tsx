import { StyleSheet, Text, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

export function OfflineBanner() {
  const net = useNetInfo();
  if (net.isConnected !== false && net.isInternetReachable !== false) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>İnternet bağlantısı yok — işlem yapılamaz</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#f97316',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: { color: '#fff', fontSize: 13, fontWeight: '800', textAlign: 'center' },
});
