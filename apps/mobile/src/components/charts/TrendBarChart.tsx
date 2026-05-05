import { StyleSheet, Text, View } from 'react-native';

type Point = { label: string; value: number };

export function TrendBarChart({ points }: { points: Point[] }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <View style={styles.wrap}>
      {points.map((p) => (
        <View key={p.label} style={styles.col}>
          <View
            style={[
              styles.bar,
              { height: Math.max(8, (p.value / max) * 120) },
            ]}
          />
          <Text numberOfLines={1} style={styles.lbl}>
            {p.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#6366f1',
    borderRadius: 6,
    width: 28,
  },
  col: { alignItems: 'center', flex: 1, gap: 6 },
  lbl: { color: '#64748b', fontSize: 10, fontWeight: '700' },
  wrap: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 6,
    height: 150,
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 8,
  },
});
