import { BaseRepository } from '../../shared/database/base-repository';
import { Product } from './types';
import { query } from '../../shared/database/pool';
import { translitVariants, hasCyrillic } from '../../shared/utils/transliterate';

class ProductRepository extends BaseRepository<Product> {
  constructor() {
    super('products', true);
  }

  async search(q: string): Promise<Product[]> {
    const patterns = [`%${q}%`];

    if (hasCyrillic(q)) {
      for (const v of translitVariants(q)) {
        patterns.push(`%${v}%`);
      }
    }

    const unique = [...new Set(patterns)];
    const orClauses = unique.map((_, i) => {
      const p = `$${i + 1}`;
      return `(name ILIKE ${p} OR sku ILIKE ${p} OR brand ILIKE ${p})`;
    });

    const result = await query(
      `SELECT * FROM products
       WHERE deleted_at IS NULL AND (${orClauses.join(' OR ')})
       ORDER BY name LIMIT 50`,
      unique
    );
    return result.rows;
  }

  async getCategories(): Promise<string[]> {
    const result = await query(
      `SELECT DISTINCT category FROM products
       WHERE deleted_at IS NULL AND category IS NOT NULL AND category != ''
       ORDER BY category`
    );
    return result.rows.map((r: any) => r.category);
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
