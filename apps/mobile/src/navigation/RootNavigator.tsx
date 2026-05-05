import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
  createNavigationContainerRef,
  type ParamListBase,
} from '@react-navigation/native';
import { setUnauthorizedHandler } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { AppStack } from './AppStack';
import { AuthStack } from './AuthStack';
import { OfflineBanner } from '../components/OfflineBanner';
import { PrivacyOverlayProvider } from '../components/PrivacyOverlayProvider';

const navRef = createNavigationContainerRef<ParamListBase>();

export function RootNavigator() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const logout = useAuthStore((state) => state.logout);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const scheme = useColorScheme();
  const routeNameRef = useRef<string | undefined>(undefined);
  const [privacyRoute, setPrivacyRoute] = useState<string | undefined>();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  if (!isHydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const theme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <NavigationContainer
      ref={navRef}
      theme={theme}
      onReady={() => {
        routeNameRef.current = navRef.getCurrentRoute()?.name;
        setPrivacyRoute(routeNameRef.current);
      }}
      onStateChange={() => {
        const r = navRef.getCurrentRoute()?.name;
        routeNameRef.current = r;
        setPrivacyRoute(r);
      }}
    >
      <View style={styles.flex}>
        <OfflineBanner />
        <PrivacyOverlayProvider currentRouteName={privacyRoute}>
          {isAuthenticated ? <AppStack /> : <AuthStack />}
        </PrivacyOverlayProvider>
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    flex: 1,
    justifyContent: 'center',
  },
  flex: { flex: 1 },
});
