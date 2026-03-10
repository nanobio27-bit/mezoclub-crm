// src/shared/database/base-repository.ts
// Базовый класс для работы с БД
// Все модули (clients, orders...) наследуют от него
// Это значит: общая логика пишется ОДИН раз здесь

import { Pool, QueryResult } from 'pg';
import { ListParams, PaginationMeta } from '../types/common';

/**
 * Базовый репозиторий — общие CRUD-операции для всех таблиц.
 * Автоматически фильтрует по tenant_id (мультитенантность).
 * 
 * Пример использования:
 * ```
 * class ClientRepository extends BaseRepository<Client> {
 *   constructor(pool: Pool) {
 *     super(pool, 'clients');
 *   }
 * }
 * // В service:
 * const repo = new ClientRepository(pool);
 * repo.findAll({ tenantId: 1, page: 1, limit: 20 });
 * ```
 */
export abstract class BaseRepository<T> {
  constructor(
    protected pool: Pool,
    protected tableName: string,
    protected hasTenant: boolean = true // Большинство таблиц мультитенантные
  ) {}

  /**
   * Найти запись по ID (с учётом soft delete и tenant)
   */
  async findById(id: number, tenantId?: number): Promise<T | null> {
    const conditions = ['id = $1', 'deleted_at IS NULL'];
    const values: any[] = [id];

    if (this.hasTenant && tenantId) {
      values.push(tenantId);
      conditions.push(`tenant_id = $${values.length}`);
    }

    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE ${conditions.join(' AND ')}`,
      values
    );
    return result.rows[0] || null;
  }

  /**
   * Получить список с пагинацией, поиском и сортировкой
   */
  async findAll(
    params: ListParams = {},
    searchColumns: string[] = ['name']
  ): Promise<{ data: T[]; meta: PaginationMeta }> {
    const {
      tenantId,
      page = 1,
      limit = 20,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = params;

    const offset = (page - 1) * limit;
    const values: any[] = [];
    const conditions: string[] = ['deleted_at IS NULL'];

    // Мультитенантность: фильтр по tenant_id
    if (this.hasTenant && tenantId) {
      values.push(tenantId);
      conditions.push(`tenant_id = $${values.length}`);
    }

    // Поиск по нескольким колонкам (ILIKE для регистронезависимости)
    if (search && searchColumns.length > 0) {
      values.push(`%${search}%`);
      const searchCondition = searchColumns
        .map(col => `${col} ILIKE $${values.length}`)
        .join(' OR ');
      conditions.push(`(${searchCondition})`);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Защита от SQL-injection в sortBy
    const allowedSortColumns = ['id', 'name', 'created_at', 'updated_at', 'status', 'total_amount'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Подсчёт общего количества
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM ${this.tableName} ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Получение данных
    const dataResult = await this.pool.query(
      `SELECT * FROM ${this.tableName} ${whereClause} 
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
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Создать новую запись
   */
  async create(data: Partial<T>): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`);

    // snake_case для колонок БД
    const columns = keys.map(key => this.toSnakeCase(key));

    const result = await this.pool.query(
      `INSERT INTO ${this.tableName} (${columns.join(', ')}) 
       VALUES (${placeholders.join(', ')}) 
       RETURNING *`,
      values
    );
    return result.rows[0];
  }

  /**
   * Обновить запись по ID
   */
  async update(id: number, data: Partial<T>): Promise<T | null> {
    const keys = Object.keys(data);
    const values = Object.values(data);

    if (keys.length === 0) return this.findById(id);

    const setClause = keys
      .map((key, i) => `${this.toSnakeCase(key)} = $${i + 1}`)
      .join(', ');

    const result = await this.pool.query(
      `UPDATE ${this.tableName} 
       SET ${setClause}, updated_at = NOW() 
       WHERE id = $${values.length + 1} AND deleted_at IS NULL 
       RETURNING *`,
      [...values, id]
    );
    return result.rows[0] || null;
  }

  /**
   * Мягкое удаление — помечаем deleted_at, не удаляем из БД
   */
  async softDelete(id: number): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE ${this.tableName} SET deleted_at = NOW() 
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Подсчёт записей с опциональным условием
   */
  async count(condition?: string, values?: any[]): Promise<number> {
    const where = condition 
      ? `WHERE deleted_at IS NULL AND ${condition}`
      : 'WHERE deleted_at IS NULL';
    
    const result = await this.pool.query(
      `SELECT COUNT(*) FROM ${this.tableName} ${where}`,
      values || []
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Конвертация camelCase → snake_case
   * Пример: totalAmount → total_amount
   */
  protected toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
