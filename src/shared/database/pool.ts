// src/shared/database/pool.ts
// Подключение к PostgreSQL через пул соединений

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Логирование подключения
pool.on('connect', () => {
  console.log('[DB] Новое соединение с PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[DB] Ошибка пула соединений:', err.message);
});

export default pool;
