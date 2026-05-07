---
name: zustand-state-manager
description: SoftShopping Zustand state yönetimi — satış konsolu sepet, auth, tenant ve tab state yönetimi
---

# Zustand State Manager — SoftShopping

## Amaç
Client-side state yönetimini Zustand ile standart ve performanslı şekilde yapar. Server Components ile uyumlu hybrid mimari.

## Store Mimarisi

### 1. Auth Store
```typescript
interface AuthState {
  user: UserInfo | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}
```

### 2. Cart Store (Satış Konsolu)
```typescript
interface CartState {
  items: CartItem[];
  customerId: string | null;
  appliedCampaigns: Campaign[];
  subtotal: number;
  discountTotal: number;
  kdvTotal: number;
  grandTotal: number;

  // Actions
  addItem: (barcode: string) => Promise<void>;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  setCustomer: (customerId: string | null) => void;
  applyDiscount: (campaignId: string) => void;
  clearCart: () => void;
  checkout: (payments: Payment[]) => Promise<Order>;
}
```

### 3. Tenant Store
```typescript
interface TenantState {
  currentTenant: Tenant | null;
  tenantId: string | null;
  settings: TenantSettings;
  setTenant: (tenant: Tenant) => void;
}
```

## Kurallar

### 1. Store Oluşturma Deseni
```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export const useCartStore = create<CartState>()(
  devtools(
    persist(
      (set, get) => ({
        items: [],
        // ...initial state
        addItem: async (barcode) => {
          // API'den ürün bilgisi al
          // Sepete ekle veya miktarı artır
          // Kampanya kontrolü
          // Toplamları yeniden hesapla
        },
      }),
      { name: 'cart-store' }
    )
  )
);
```

### 2. Selector Kullanımı (Performans)
```typescript
// ✅ DOĞRU — sadece gerekli state'i seç
const items = useCartStore((s) => s.items);
const total = useCartStore((s) => s.grandTotal);

// ❌ YANLIŞ — tüm store'u seçme
const store = useCartStore();
```

### 3. Server Component Uyumu
- Store SADECE `'use client'` bileşenlerde kullanılır
- Server Components'ta `serverFetch` ile veri alınır
- Hydration: JWT cookie'den okunur → Zustand'a senkronize edilir

### 4. Computed Values
Toplamlar her değişiklikte otomatik hesaplanır:

```typescript
const recalculate = (items: CartItem[]) => {
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const discountTotal = items.reduce((sum, i) => sum + (i.discountAmount ?? 0), 0);
  const kdvTotal = items.reduce((sum, i) => {
    const net = i.unitPrice * i.quantity - (i.discountAmount ?? 0);
    return sum + (net * i.kdvRate / 100);
  }, 0);
  return { subtotal, discountTotal, kdvTotal, grandTotal: subtotal - discountTotal + kdvTotal };
};
```

## Modül Kullanımları

| Store | Modül | Persist |
|-------|-------|---------|
| `useAuthStore` | Login/Logout, tüm sayfalar | ✅ (sessionStorage) |
| `useCartStore` | Satış Konsolu | ✅ (localStorage) |
| `useTenantStore` | Tüm sayfalar | ✅ |
| `useTabStore` | Tab yönetimi | ❌ |
| `useNotificationStore` | Bildirimler | ❌ |
