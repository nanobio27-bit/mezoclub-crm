import { BaseRepository } from '../../shared/database/base-repository';
import { Client } from './types';
import { query } from '../../shared/database/pool';
import { translitVariants, hasCyrillic } from '../../shared/utils/transliterate';

class ClientRepository extends BaseRepository<Client> {
  constructor() {
    super('clients', true);
  }

  async search(q: string): Promise<Client[]> {
    const patterns = [`%${q}%`];

    if (hasCyrillic(q)) {
      for (const v of translitVariants(q)) {
        patterns.push(`%${v}%`);
      }
    }

    const unique = [...new Set(patterns)];
    const orClauses = unique.map((_, i) => {
      const p = `$${i + 1}`;
      return `(name ILIKE ${p} OR email ILIKE ${p} OR phone ILIKE ${p} OR company ILIKE ${p})`;
    });

    const result = await query(
      `SELECT * FROM clients
       WHERE deleted_at IS NULL AND (${orClauses.join(' OR ')})
       ORDER BY created_at DESC LIMIT 50`,
      unique
    );
    return result.rows;
  }
}

export const clientRepository = new ClientRepository();
