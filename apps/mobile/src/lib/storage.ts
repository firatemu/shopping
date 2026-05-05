import { createMMKV, type MMKV } from 'react-native-mmkv';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '../types/auth';

const secureKeyName = 'textilepos_mmkv_encryption_v1';
const keys = {
  accessToken: 'auth.accessToken',
  refreshToken: 'auth.refreshToken',
  tenantId: 'auth.tenantId',
  user: 'auth.user',
} as const;

let mmkvInstance: MMKV | null = null;
let initPromise: Promise<void> | null = null;

async function getOrCreateEncryptionKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(secureKeyName);
  if (existing && existing.length >= 32) return existing;
  const bytes = await Crypto.getRandomBytesAsync(32);
  const hex = Array.from(bytes).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
  await SecureStore.setItemAsync(secureKeyName, hex);
  return hex;
}

export async function ensureStorageInitialized(): Promise<void> {
  if (mmkvInstance) return;
  if (!initPromise) {
    initPromise = (async () => {
      const encryptionKey = await getOrCreateEncryptionKey();
      mmkvInstance = createMMKV({
        id: 'textilepos-mobile',
        encryptionKey,
      });
    })();
  }
  await initPromise;
}

function getMmkv(): MMKV {
  if (!mmkvInstance) {
    throw new Error('Storage not ready — call ensureStorageInitialized() before use');
  }
  return mmkvInstance;
}

function parseJson<T>(value: string | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export const authStorage = {
  getAccessToken: () => getMmkv().getString(keys.accessToken) ?? null,
  setAccessToken: (token: string) => getMmkv().set(keys.accessToken, token),
  getRefreshToken: () => getMmkv().getString(keys.refreshToken) ?? null,
  setRefreshToken: (token: string) => getMmkv().set(keys.refreshToken, token),
  getTenantId: () => getMmkv().getString(keys.tenantId) ?? null,
  setTenantId: (tenantId: string) => getMmkv().set(keys.tenantId, tenantId),
  getUser: () => parseJson<AuthUser>(getMmkv().getString(keys.user)),
  setUser: (user: AuthUser) => getMmkv().set(keys.user, JSON.stringify(user)),
  clear: () => {
    const s = getMmkv();
    s.remove(keys.accessToken);
    s.remove(keys.refreshToken);
    s.remove(keys.tenantId);
    s.remove(keys.user);
  },
};
