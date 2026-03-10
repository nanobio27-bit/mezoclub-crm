// src/shared/types/common.ts
// Общие типы для всего проекта
// Эти интерфейсы описывают "форму" данных — как выглядит клиент, заказ, товар

// ============================================
// ПОЛЬЗОВАТЕЛИ
// ============================================

/** Роли пользователей CRM */
export const USER_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  SALES: 'sales',
  LOGISTICS: 'logistics',
  OPERATOR: 'operator',
  VIEWER: 'viewer',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

/** Пользователь системы (сотрудник MezoClub) */
export interface User {
  id: number;
  email: string;
  name: string;
  roles: UserRole[];
  accountType: 'internal' | 'external';
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Данные для регистрации */
export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  roles?: UserRole[];
  phone?: string;
}

/** Данные для логина */
export interface LoginDto {
  email: string;
  password: string;
}

/** Ответ при успешном логине */
export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  accessToken: string;
  refreshToken: string;
}

// ============================================
// КЛИЕНТЫ
// ============================================

export const CLIENT_TYPES = {
  CLINIC: 'clinic',
  COSMETOLOGIST: 'cosmetologist',
  DISTRIBUTOR: 'distributor',
} as const;

export type ClientType = typeof CLIENT_TYPES[keyof typeof CLIENT_TYPES];

export const CLIENT_STATUSES = {
  NEW: 'new',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  LOST: 'lost',
} as const;

export type ClientStatus = typeof CLIENT_STATUSES[keyof typeof CLIENT_STATUSES];

/** Клиент (клиника или косметолог) */
export interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  clientType: ClientType;
  segment?: string;
  status: ClientStatus;
  managerId?: number;
  managerName?: string;       // JOIN с users
  city?: string;
  address?: string;
  source?: string;
  notes?: string;
  totalOrders: number;
  totalRevenue: number;
  lastOrderAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClientDto {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  clientType?: ClientType;
  segment?: string;
  managerId?: number;
  city?: string;
  address?: string;
  source?: string;
  notes?: string;
}

export interface UpdateClientDto extends Partial<CreateClientDto> {
  status?: ClientStatus;
}

// ============================================
// ТОВАРЫ
// ============================================

/** Товар из каталога MezoClub */
export interface Product {
  id: number;
  name: string;
  sku?: string;
  brand?: string;
  category?: string;
  description?: string;
  price: number;              // Цена продажи
  costPrice?: number;         // Себестоимость
  stockQuantity: number;      // Текущий остаток
  minStockLevel: number;      // Минимальный остаток
  unit: string;               // шт, упаковка...
  isActive: boolean;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductDto {
  name: string;
  sku?: string;
  brand?: string;
  category?: string;
  description?: string;
  price: number;
  costPrice?: number;
  stockQuantity?: number;
  minStockLevel?: number;
  unit?: string;
  imageUrl?: string;
}

// ============================================
// ЗАКАЗЫ
// ============================================

export const ORDER_STATUSES = {
  NEW: 'new',
  CONFIRMED: 'confirmed',
  IN_PRODUCTION: 'in_production',
  READY: 'ready',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
} as const;

export type OrderStatus = typeof ORDER_STATUSES[keyof typeof ORDER_STATUSES];

export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUSES[keyof typeof PAYMENT_STATUSES];

/** Заказ */
export interface Order {
  id: number;
  orderNumber: string;         // MC-2026-00001
  clientId: number;
  clientName?: string;         // JOIN с clients
  managerId?: number;
  managerName?: string;        // JOIN с users
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  deliveryType?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  trackingNumber?: string;
  notes?: string;
  items?: OrderItem[];
  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Позиция в заказе */
export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  totalPrice: number;
}

export interface CreateOrderDto {
  clientId: number;
  managerId?: number;
  deliveryType?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  notes?: string;
  items: {
    productId: number;
    quantity: number;
    discountPercent?: number;
  }[];
}

// ============================================
// DASHBOARD
// ============================================

/** Данные для главного экрана */
export interface DashboardData {
  todayRevenue: number;
  todayRevenueChange: number;    // % изменение vs вчера
  activeOrders: number;
  activeClients: number;
  lowStockProducts: number;
  recentOrders: Order[];         // Последние 10 заказов
  topProducts: {                 // Топ-5 товаров по продажам
    product: Product;
    totalSold: number;
    totalRevenue: number;
  }[];
  ordersByStatus: {              // Распределение заказов по статусам
    status: OrderStatus;
    count: number;
  }[];
}

// ============================================
// ОБЩИЕ ТИПЫ ДЛЯ API
// ============================================

/** Формат успешного ответа API */
export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

/** Формат ошибки API */
export interface ApiError {
  error: string;                 // Человекочитаемое сообщение
  code: string;                  // Машинный код: AUTH_EXPIRED, NOT_FOUND...
  details?: Record<string, string>;
  requestId?: string;
}

/** Мета-данные пагинации */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/** Параметры запроса списка */
export interface ListParams {
  tenantId?: number;         // ID тенанта (подставляется middleware автоматически)
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** JWT payload — что хранится в токене */
export interface JwtPayload {
  userId: number;
  email: string;
  roles: UserRole[];
  accountType: string;
  tenantId: number;           // ID текущего тенанта
}
