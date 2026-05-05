import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BarcodeScannerScreen } from '../screens/barcode/BarcodeScannerScreen';
import { CampaignDetailScreen } from '../screens/campaigns/CampaignDetailScreen';
import { CampaignListScreen } from '../screens/campaigns/CampaignListScreen';
import { CollectionScreen } from '../screens/customers/CollectionScreen';
import { CustomerDetailScreen } from '../screens/customers/CustomerDetailScreen';
import { CustomerSelectScreen } from '../screens/customers/CustomerSelectScreen';
import { NewCustomerScreen } from '../screens/customers/NewCustomerScreen';
import { CashMovementScreen } from '../screens/cash-register/CashMovementScreen';
import { CloseCashRegisterScreen } from '../screens/cash-register/CloseCashRegisterScreen';
import { OpenCashRegisterScreen } from '../screens/cash-register/OpenCashRegisterScreen';
import { StockAdjustmentScreen } from '../screens/inventory/StockAdjustmentScreen';
import { StockMovementScreen } from '../screens/inventory/StockMovementScreen';
import { CashReportScreen } from '../screens/reports/CashReportScreen';
import { DashboardScreen } from '../screens/reports/DashboardScreen';
import { SalesReportScreen } from '../screens/reports/SalesReportScreen';
import { StockReportScreen } from '../screens/reports/StockReportScreen';
import { GiftVoucherDetailScreen } from '../screens/gift-vouchers/GiftVoucherDetailScreen';
import { GiftVoucherListScreen } from '../screens/gift-vouchers/GiftVoucherListScreen';
import { NewGiftVoucherScreen } from '../screens/gift-vouchers/NewGiftVoucherScreen';
import { ExpenseCategoryScreen } from '../screens/expenses/ExpenseCategoryScreen';
import { ExpenseListScreen } from '../screens/expenses/ExpenseListScreen';
import { NewExpenseScreen } from '../screens/expenses/NewExpenseScreen';
import { PaymentScreen } from '../screens/pos/PaymentScreen';
import { ReceiptScreen } from '../screens/pos/ReceiptScreen';
import { ProductDetailScreen } from '../screens/products/ProductDetailScreen';
import type { AppStackParamList } from '../types/navigation';
import { AppTabs } from './AppTabs';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={AppTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Ürün detayı' }} />
      <Stack.Screen name="BarcodeScanner" component={BarcodeScannerScreen} options={{ title: 'Barkod oku' }} />
      <Stack.Screen name="CustomerSelect" component={CustomerSelectScreen} options={{ title: 'Müşteri seç' }} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: 'Müşteri' }} />
      <Stack.Screen name="NewCustomer" component={NewCustomerScreen} options={{ title: 'Yeni müşteri' }} />
      <Stack.Screen name="Collection" component={CollectionScreen} options={{ title: 'Cari tahsilat' }} />
      <Stack.Screen name="StockMovement" component={StockMovementScreen} options={{ title: 'Stok hareketleri' }} />
      <Stack.Screen name="StockAdjustment" component={StockAdjustmentScreen} options={{ title: 'Stok düzeltme' }} />
      <Stack.Screen name="OpenCashRegister" component={OpenCashRegisterScreen} options={{ title: 'Kasa aç' }} />
      <Stack.Screen name="CloseCashRegister" component={CloseCashRegisterScreen} options={{ title: 'Kasa kapat' }} />
      <Stack.Screen name="CashMovement" component={CashMovementScreen} options={{ title: 'Para hareketi' }} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Özet' }} />
      <Stack.Screen name="SalesReport" component={SalesReportScreen} options={{ title: 'Satış raporu' }} />
      <Stack.Screen name="StockReport" component={StockReportScreen} options={{ title: 'Stok raporu' }} />
      <Stack.Screen name="CashReport" component={CashReportScreen} options={{ title: 'Kasa raporu' }} />
      <Stack.Screen name="CampaignList" component={CampaignListScreen} options={{ title: 'Kampanyalar' }} />
      <Stack.Screen name="CampaignDetail" component={CampaignDetailScreen} options={{ title: 'Kampanya' }} />
      <Stack.Screen name="GiftVoucherList" component={GiftVoucherListScreen} options={{ title: 'Hediye çekleri' }} />
      <Stack.Screen name="GiftVoucherDetail" component={GiftVoucherDetailScreen} options={{ title: 'Hediye çeki' }} />
      <Stack.Screen name="NewGiftVoucher" component={NewGiftVoucherScreen} options={{ title: 'Yeni çek' }} />
      <Stack.Screen name="ExpenseList" component={ExpenseListScreen} options={{ title: 'Gelir-gider' }} />
      <Stack.Screen name="NewExpense" component={NewExpenseScreen} options={{ title: 'Yeni kayıt' }} />
      <Stack.Screen name="ExpenseCategories" component={ExpenseCategoryScreen} options={{ title: 'Kategoriler' }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Ödeme' }} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} options={{ title: 'Fiş önizleme' }} />
    </Stack.Navigator>
  );
}
