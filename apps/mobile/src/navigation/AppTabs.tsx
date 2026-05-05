import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CashRegisterScreen } from '../screens/cash-register/CashRegisterScreen';
import { CustomerListScreen } from '../screens/customers/CustomerListScreen';
import { InventoryScreen } from '../screens/inventory/InventoryScreen';
import { PosScreen } from '../screens/pos/PosScreen';
import { ProductListScreen } from '../screens/products/ProductListScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import type { AppTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        tabBarActiveTintColor: '#4f46e5',
      }}
    >
      <Tab.Screen name="POS" component={PosScreen} options={{ title: 'POS' }} />
      <Tab.Screen name="Products" component={ProductListScreen} options={{ title: 'Ürünler' }} />
      <Tab.Screen name="Customers" component={CustomerListScreen} options={{ title: 'Müşteriler' }} />
      <Tab.Screen name="Inventory" component={InventoryScreen} options={{ title: 'Envanter' }} />
      <Tab.Screen name="CashRegister" component={CashRegisterScreen} options={{ title: 'Kasa' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Ayarlar' }} />
    </Tab.Navigator>
  );
}
