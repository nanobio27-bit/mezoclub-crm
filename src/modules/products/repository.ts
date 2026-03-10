// src/modules/products/repository.ts
// Репозиторий товаров — наследует от BaseRepository

import { Pool } from 'pg';
import { BaseRepository } from '../../shared/database/base-repository';
import { Product, PaginationMeta } from '../../shared/types/common';
import { ProductListParams } from './types';

export class ProductRepository extends BaseRepository<Product> {
  constructor(pool: Pool) {
    super(pool, 'products', true);
  }

  /** Получить список товаров с фильтрами */
  async findAllFiltered(
    params: ProductListParams
  ): Promise<{ data: Product[]; meta: PaginationMeta }> {
    const {
      tenantId,
      page = 1,
      limit = 20,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
      category,
      brand,
      isActive,
    } = params;

    const offset = (page - 1) * limit;
    const values: unknown[] = [];
    const conditions: string[] = ['deleted_at IS NULL'];

    // Мультитенантность
    if (tenantId) {
      values.push(tenantId);
      conditions.push(`tenant_id = $${values.length}`);
    }

    // Поиск
    if (search) {
      values.push(`%${search}%`);
      conditions.push(
        `(name ILIKE $${values.length} OR sku ILIKE $${values.length} OR brand ILIKE $${values.length})`
      );
    }

    // Фильтры
    if (category) {
      values.push(category);
      conditions.push(`category = $${values.length}`);
    }
    if (brand) {
      values.push(brand);
      conditions.push(`brand = $${values.length}`);
    }
    if (isActive !== undefined) {
      values.push(isActive);
      conditions.push(`is_active = $${values.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const allowedSort = ['id', 'name', 'created_at', 'updated_at', 'price', 'stock_quantity', 'brand', 'category'];
    const safeSortBy = allowedSort.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM products ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await this.pool.query(
      `SELECT * FROM products ${whereClause}
       ORDER BY ${safeSortBy} ${safeSortOrder}
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    return {
      data: dataResult.rows,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /** Товары с низким остатком */
  async findLowStock(tenantId: number): Promise<Product[]> {
    const result = await this.pool.query(
      `SELECT * FROM products 
       WHERE tenant_id = $1 
         AND stock_quantity <= min_stock_level 
         AND is_active = true 
         AND deleted_at IS NULL
       ORDER BY stock_quantity ASC`,
      [tenantId]
    );
    return result.rows;
  }

  /** Обновить остаток товара */
  async updateStock(id: number, quantityChange: number): Promise<void> {
    await this.pool.query(
      `UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL`,
      [quantityChange, id]
    );
  }

  /** Получить товар по ID с проверкой тенанта */
  async findByIdAndTenant(id: number, tenantId: number): Promise<Product | null> {
    const result = await this.pool.query(
      'SELECT * FROM products WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [id, tenantId]
    );
    return result.rows[0] || null;
  }
}
