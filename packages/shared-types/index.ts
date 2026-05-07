/**
 * SoftShopping — Shared Types
 *
 * Common interfaces and types shared between backend, frontend, and mobile.
 */

// ==========================================
// Auth
// ==========================================
export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: UserInfo;
}

export interface UserInfo {
    id: string;
    tenantId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
}

export type UserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'STORE_MANAGER' | 'SENIOR_SALES' | 'SALES_STAFF' | 'CASHIER' | 'ACCOUNTANT';

// ==========================================
// Products
// ==========================================
export interface ProductDto {
    id: string;
    tenantId: string;
    name: string;
    brand: string;
    category: string;
    subcategory?: string;
    gender: string;
    costPrice: number;
    salePrice: number;
    kdvRate: number;
    variants?: ProductVariantDto[];
}

export interface ProductVariantDto {
    id: string;
    barcode: string;
    color: string;
    colorCode: string;
    size: string;
    sizeCode: string;
    stockQuantity: number;
    minStockLevel: number;
}

// ==========================================
// Sales
// ==========================================
export interface CheckoutRequest {
    items: CheckoutItem[];
    payments: PaymentItem[];
    customerId?: string;
    notes?: string;
}

export interface CheckoutItem {
    variantId: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
}

export interface PaymentItem {
    method: PaymentMethod;
    amount: number;
    reference?: string;
}

export type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'OPEN_ACCOUNT' | 'GIFT_VOUCHER' | 'MIXED';

export interface OrderDto {
    id: string;
    orderNumber: string;
    totalAmount: number;
    discountAmount: number;
    netAmount: number;
    status: OrderStatus;
    items: OrderItemDto[];
    payments: PaymentItem[];
}

export type OrderStatus = 'PENDING' | 'COMPLETED' | 'RETURNED' | 'PARTIALLY_RETURNED' | 'CANCELLED';

export interface OrderItemDto {
    variantId: string;
    productName: string;
    barcode: string;
    color: string;
    size: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    totalPrice: number;
}

// ==========================================
// Customers
// ==========================================
export interface CustomerDto {
    id: string;
    name: string;
    surname: string;
    companyName?: string;
    taxId?: string;
    phone?: string;
    email?: string;
    currentBalance: number;
    creditLimit: number;
}

// ==========================================
// Reporting
// ==========================================
export interface DashboardKpis {
    todayRevenue: number;
    todayOrders: number;
    todayReturns: number;
    activeCustomers: number;
    lowStockCount: number;
}

export interface DailySalesReport {
    totalOrders: number;
    totalReturns: number;
    revenue: number;
    returnAmount: number;
    netRevenue: number;
    totalItems: number;
    paymentBreakdown: Record<string, number>;
}

// ==========================================
// Pagination
// ==========================================
export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface PaginationQuery {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
