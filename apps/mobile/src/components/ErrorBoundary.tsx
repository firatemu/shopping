import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = { children: ReactNode };

type State = { hasError: boolean; message: string | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('ErrorBoundary', error.message, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Beklenmeyen hata</Text>
          <Text style={styles.desc}>{this.state.message ?? 'Uygulama yeniden başlatılabilir.'}</Text>
          <Pressable
            onPress={() => this.setState({ hasError: false, message: null })}
            style={styles.btn}
          >
            <Text style={styles.btnText}>Yeniden dene</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  btnText: { color: '#fff', fontWeight: '800' },
  desc: { color: '#64748b', marginTop: 8, textAlign: 'center' },
  title: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  wrap: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
});
