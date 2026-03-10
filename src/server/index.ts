import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { pool } from '../shared/database/pool';

const PORT = process.env.PORT || 3001;

async function start() {
  // Verify DB connection
  try {
    await pool.query('SELECT 1');
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`MezoClub CRM API running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

start();
