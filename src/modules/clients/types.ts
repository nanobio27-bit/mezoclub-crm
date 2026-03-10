// src/modules/clients/types.ts
// Типы модуля клиентов

import { z } from 'zod';
import { ListParams } from '../../shared/types/common';

/** Схема валидации создания клиента */
export const createClientSchema = z.object({
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
  email: z.string().email('Некорректный email').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  clientType: z.enum(['clinic', 'cosmetologist', 'distributor']).optional(),
  segment: z.string().optional(),
  managerId: z.number().int().positive().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

/** Схема валидации обновления клиента */
export const updateClientSchema = createClientSchema.partial().extend({
  status: z.enum(['new', 'active', 'inactive', 'lost']).optional(),
});

/** Параметры фильтрации клиентов */
export interface ClientListParams extends ListParams {
  status?: string;
  clientType?: string;
  managerId?: number;
}
