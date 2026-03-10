import { BaseRepository } from '../../shared/database/base-repository';
import { Client } from './types';
import { query } from '../../shared/database/pool';

class ClientRepository extends BaseRepository<Client> {
  constructor() {
    super('clients', true);
  }

  async search(q: string): Promise<Client[]> {
    const result = await query(
      `SELECT * FROM clients
       WHERE deleted_at IS NULL
         AND (name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR company ILIKE $1)
       ORDER BY created_at DESC LIMIT 50`,
      [`%${q}%`]
    );
    return result.rows;
  }
}

export const clientRepository = new ClientRepository();
