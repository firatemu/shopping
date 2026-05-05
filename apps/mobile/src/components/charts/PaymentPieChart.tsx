import { View } from 'react-native';
import { PolarChart, Pie } from 'victory-native';

const COLORS = ['#4f46e5', '#16a34a', '#ea580c', '#0ea5e9', '#a855f7', '#64748b'];

type Slice = { key: string; value: number };

export function PaymentPieChart({ slices }: { slices: Slice[] }) {
  const data = slices
    .filter((s) => s.value > 0)
    .map((s, i) => ({
      label: paymentLabel(s.key),
      value: s.value,
      color: COLORS[i % COLORS.length],
    }));

  if (data.length === 0) return null;

  return (
    <View style={{ height: 240 }}>
      <PolarChart data={data} labelKey="label" valueKey="value" colorKey="color">
        <Pie.Chart innerRadius="42%" />
      </PolarChart>
    </View>
  );
}

function paymentLabel(k: string): string {
  const map: Record<string, string> = {
    CASH: 'Nakit',
    CREDIT_CARD: 'Kart',
    BANK_TRANSFER: 'Havale',
    OPEN_ACCOUNT: 'Açık hesap',
    GIFT_VOUCHER: 'Hediye çeki',
    MIXED: 'Karma',
  };
  return map[k] ?? k;
}
