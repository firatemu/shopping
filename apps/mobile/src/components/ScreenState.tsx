import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type ScreenStateProps = {
  title: string;
  description?: string;
  loading?: boolean;
  tone?: 'default' | 'error' | 'success';
};

export function ScreenState({ title, description, loading = false, tone = 'default' }: ScreenStateProps) {
  const titleStyle = tone === 'error' ? styles.errorTitle : tone === 'success' ? styles.successTitle : styles.title;

  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator size="large" color="#4f46e5" /> : null}
      <Text style={titleStyle}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  description: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorTitle: {
    color: '#dc2626',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  successTitle: {
    color: '#16a34a',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  title: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
