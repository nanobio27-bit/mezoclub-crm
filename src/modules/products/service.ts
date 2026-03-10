// src/modules/products/service.ts
// Бизнес-логика товаров

import { ProductRepository } from './repository';
import { ProductListParams } from './types';
import { Product, CreateProductDto, PaginationMeta } from '../../shared/types/common';
import { AppError } from '../../shared/middleware/error-handler';

export class ProductService {
  constructor(private repo: ProductRepository) {}

  /** Получить список товаров */
  async getAll(params: ProductListParams): Promise<{ data: Product[]; meta: PaginationMeta }> {
    return this.repo.findAllFiltered(params);
  }

  /** Получить товар по ID */
  async getById(id: number, tenantId: number): Promise<Product> {
    const product = await this.repo.findByIdAndTenant(id, tenantId);
    if (!product) {
      throw new AppError(404, 'NOT_FOUND', 'Товар не найден');
    }
    return product;
  }

  /** Создать товар */
  async create(data: CreateProductDto, tenantId: number): Promise<Product> {
    const productData = {
      ...data,
      tenantId,
    };
    return this.repo.create(productData as Partial<Product>);
  }

  /** Обновить товар */
  async update(id: number, data: Partial<CreateProductDto> & { isActive?: boolean }, tenantId: number): Promise<Product> {
    const existing = await this.repo.findByIdAndTenant(id, tenantId);
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Товар не найден');
    }

    const updated = await this.repo.update(id, data as Partial<Product>);
    if (!updated) {
      throw new AppError(500, 'INTERNAL_ERROR', 'Не удалось обновить товар');
    }
    return updated;
  }

  /** Мягкое удаление товара */
  async delete(id: number, tenantId: number): Promise<void> {
    const existing = await this.repo.findByIdAndTenant(id, tenantId);
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Товар не найден');
    }

    const deleted = await this.repo.softDelete(id);
    if (!deleted) {
      throw new AppError(500, 'INTERNAL_ERROR', 'Не удалось удалить товар');
    }
  }

  /** Товары с низким остатком */
  async getLowStock(tenantId: number): Promise<Product[]> {
    return this.repo.findLowStock(tenantId);
  }
}
