// src/modules/orders/types.ts
// Типы модуля заказов

import { z } from 'zod';
import { ListParams, OrderStatus } from '../../shared/types/common';

/** Схема валидации создания заказа */
export const createOrderSchema = z.object({
  clientId: z.number().int().positive('ID клиента обязателен'),
  managerId: z.number().int().positive().optional(),
  deliveryType: z.string().optional(),
  deliveryAddress: z.string().optional(),
  deliveryCity: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.number().int().positive('ID товара обязателен'),
    quantity: z.number().int().positive('Количество должно быть больше 0'),
    discountPercent: z.number().min(0).max(100).optional(),
  })).min(1, 'Заказ должен содержать хотя бы одну позицию'),
});

/** Схема валидации обновления заказа */
export const updateOrderSchema = z.object({
  deliveryType: z.string().optional(),
  deliveryAddress: z.string().optional(),
  deliveryCity: z.string().optional(),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
  paymentStatus: z.enum(['pending', 'partial', 'paid', 'overdue']).optional(),
  paidAmount: z.number().min(0).optional(),
  discountAmount: z.number().min(0).optional(),
});

/** Схема валидации смены статуса */
export const changeStatusSchema = z.object({
  status: z.enum([
    'new', 'confirmed', 'in_production', 'ready',
    'shipped', 'delivered', 'completed', 'cancelled', 'returned',
  ]),
});

/** Параметры фильтрации заказов */
export interface OrderListParams extends ListParams {
  status?: string;
  clientId?: number;
  managerId?: number;
  paymentStatus?: string;
}

/** Допустимые переходы статусов заказа */
export const STATUS_TRANSITIONS: Record<string, OrderStatus[]> = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['in_production', 'cancelled'],
  in_production: ['ready', 'cancelled'],
  ready: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: ['completed', 'returned'],
  completed: [],
  cancelled: [],
  returned: [],
};
