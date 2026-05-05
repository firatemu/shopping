import { useEffect, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus, Modal, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';

const sensitiveRoutes = new Set([
  'Payment',
  'Collection',
  'CashRegister',
  'CloseCashRegister',
  'CashMovement',
  'OpenCashRegister',
]);

/** Kasa / ödeme / tahsilat ekranlarında arka plana geçince içeriği bulanıklaştırır. */
export function PrivacyOverlayProvider({
  currentRouteName,
  children,
}: {
  currentRouteName: string | undefined;
  children: ReactNode;
}) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onChange = (s: AppStateStatus) => {
      const sensitive = currentRouteName != null && sensitiveRoutes.has(currentRouteName);
      if (s !== 'active' && sensitive) setHidden(true);
      else setHidden(false);
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [currentRouteName]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      <Modal animationType="none" transparent visible={hidden}>
        <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
      </Modal>
    </View>
  );
}
