import { query } from './pool';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export abstract class BaseRepository<T extends { id?: number }> {
  constructor(
    protected tableName: string,
    protected softDelete = false
  ) {}

  private get activeFilter(): string {
    return this.softDelete ? `${this.tableName}.deleted_at IS NULL` : '1=1';
  }

  async findById(id: number): Promise<T | null> {
    const result = await query(
      `SELECT * FROM ${this.tableName} WHERE id = $1 AND ${this.activeFilter}`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findAll(
    filters: Record<string, any> = {},
    pagination?: PaginationParams
  ): Promise<PaginatedResult<T>> {
    const conditions: string[] = [this.activeFilter];
    const values: any[] = [];
    let paramIdx = 1;

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'string' && value.includes('%')) {
          conditions.push(`${key} ILIKE $${paramIdx}`);
        } else {
          conditions.push(`${key} = $${paramIdx}`);
        }
        values.push(value);
        paramIdx++;
      }
    }

    const where = conditions.join(' AND ');
    const countResult = await query(
      `SELECT COUNT(*) FROM ${this.tableName} WHERE ${where}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT * FROM ${this.tableName} WHERE ${where} ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...values, limit, offset]
    );

    return { data: result.rows, total, page, limit };
  }

  async create(data: Partial<T>): Promise<T> {
    const keys = Object.keys(data).filter((k) => data[k as keyof T] !== undefined);
    const values = keys.map((k) => data[k as keyof T]);
    const placeholders = keys.map((_, i) => `$${i + 1}`);

    const result = await query(
      `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async update(id: number, data: Partial<T>): Promise<T | null> {
    const keys = Object.keys(data).filter((k) => data[k as keyof T] !== undefined);
    if (keys.length === 0) return this.findById(id);

    const sets = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = keys.map((k) => data[k as keyof T]);

    const result = await query(
      `UPDATE ${this.tableName} SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${keys.length + 1} AND ${this.activeFilter} RETURNING *`,
      [...values, id]
    );
    return result.rows[0] || null;
  }

  async delete(id: number): Promise<boolean> {
    if (this.softDelete) {
      const result = await query(
        `UPDATE ${this.tableName} SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
        [id]
      );
      return result.rowCount! > 0;
    }
    const result = await query(
      `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.rowCount! > 0;
  }
}
