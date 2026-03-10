// src/modules/products/types.ts
// Типы модуля товаров

import { z } from 'zod';
import { ListParams } from '../../shared/types/common';

/** Схема валидации создания товара */
export const createProductSchema = z.object({
  name: z.string().min(2, 'Название должно содержать минимум 2 символа'),
  sku: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive('Цена должна быть больше 0'),
  costPrice: z.number().positive().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  minStockLevel: z.number().int().min(0).optional(),
  unit: z.string().optional(),
  imageUrl: z.string().optional(),
});

/** Схема валидации обновления товара */
export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

/** Параметры фильтрации товаров */
export interface ProductListParams extends ListParams {
  category?: string;
  brand?: string;
  isActive?: boolean;
}
