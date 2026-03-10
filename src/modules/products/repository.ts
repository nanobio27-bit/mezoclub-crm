import { BaseRepository } from '../../shared/database/base-repository';
import { Product } from './types';
import { query } from '../../shared/database/pool';

class ProductRepository extends BaseRepository<Product> {
  constructor() {
    super('products', true);
  }

  async search(q: string): Promise<Product[]> {
    const result = await query(
      `SELECT * FROM products
       WHERE deleted_at IS NULL
         AND (name ILIKE $1 OR sku ILIKE $1 OR brand ILIKE $1)
       ORDER BY name LIMIT 50`,
      [`%${q}%`]
    );
    return result.rows;
  }

  async getLowStock(): Promise<Product[]> {
    const result = await query(
      `SELECT * FROM products
       WHERE deleted_at IS NULL AND is_active = true
         AND stock_quantity <= min_stock_level
       ORDER BY stock_quantity ASC`
    );
    return result.rows;
  }
}

export const productRepository = new ProductRepository();
