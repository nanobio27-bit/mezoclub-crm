// src/modules/clients/repository.ts
// Репозиторий клиентов — наследует от BaseRepository

import { Pool } from 'pg';
import { BaseRepository } from '../../shared/database/base-repository';
import { Client, PaginationMeta } from '../../shared/types/common';
import { ClientListParams } from './types';

export class ClientRepository extends BaseRepository<Client> {
  constructor(pool: Pool) {
    super(pool, 'clients', true);
  }

  /** Получить список клиентов с JOIN на менеджера и фильтрами */
  async findAllWithManager(
    params: ClientListParams
  ): Promise<{ data: Client[]; meta: PaginationMeta }> {
    const {
      tenantId,
      page = 1,
      limit = 20,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
      status,
      clientType,
      managerId,
    } = params;

    const offset = (page - 1) * limit;
    const values: unknown[] = [];
    const conditions: string[] = ['c.deleted_at IS NULL'];

    // Мультитенантность
    if (tenantId) {
      values.push(tenantId);
      conditions.push(`c.tenant_id = $${values.length}`);
    }

    // Поиск по нескольким полям
    if (search) {
      values.push(`%${search}%`);
      conditions.push(
        `(c.name ILIKE $${values.length} OR c.company ILIKE $${values.length} OR c.email ILIKE $${values.length} OR c.phone ILIKE $${values.length} OR c.city ILIKE $${values.length})`
      );
    }

    // Фильтры
    if (status) {
      values.push(status);
      conditions.push(`c.status = $${values.length}`);
    }
    if (clientType) {
      values.push(clientType);
      conditions.push(`c.client_type = $${values.length}`);
    }
    if (managerId) {
      values.push(managerId);
      conditions.push(`c.manager_id = $${values.length}`);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Защита от SQL-injection в sortBy
    const allowedSort = ['id', 'name', 'created_at', 'updated_at', 'status', 'total_orders', 'total_revenue', 'city'];
    const safeSortBy = allowedSort.includes(sortBy) ? `c.${sortBy}` : 'c.created_at';
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Подсчёт
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM clients c ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Данные с JOIN на менеджера
    const dataResult = await this.pool.query(
      `SELECT c.*, u.name as manager_name
       FROM clients c
       LEFT JOIN users u ON c.manager_id = u.id
       ${whereClause}
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

  /** Получить одного клиента с именем менеджера */
  async findByIdWithManager(id: number, tenantId?: number): Promise<Client | null> {
    const conditions = ['c.id = $1', 'c.deleted_at IS NULL'];
    const values: unknown[] = [id];

    if (tenantId) {
      values.push(tenantId);
      conditions.push(`c.tenant_id = $${values.length}`);
    }

    const result = await this.pool.query(
      `SELECT c.*, u.name as manager_name
       FROM clients c
       LEFT JOIN users u ON c.manager_id = u.id
       WHERE ${conditions.join(' AND ')}`,
      values
    );
    return result.rows[0] || null;
  }
}
