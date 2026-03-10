import { query, pool } from '../../shared/database/pool';
import { GinCoinWallet, GinCoinTransaction } from './types';
import { ApiError } from '../../shared/types/api-error';

export function calculateLevel(totalEarned: number): string {
  if (totalEarned >= 50000) return 'platinum';
  if (totalEarned >= 15000) return 'gold';
  if (totalEarned >= 5000) return 'silver';
  if (totalEarned >= 1000) return 'bronze';
  return 'newcomer';
}

export async function getOrCreateWallet(userId: number): Promise<GinCoinWallet> {
  const existing = await query(
    'SELECT * FROM gincoin_wallets WHERE user_id = $1',
    [userId]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const result = await query(
    `INSERT INTO gincoin_wallets (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING *`,
    [userId]
  );
  return result.rows[0];
}

export async function addTransaction(
  userId: number,
  type: string,
  amount: number,
  source: string | null,
  referenceId: number | null,
  description: string | null
): Promise<GinCoinTransaction> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure wallet exists
    const walletRes = await client.query(
      `INSERT INTO gincoin_wallets (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING *`,
      [userId]
    );
    const wallet: GinCoinWallet = walletRes.rows[0];

    // Insert transaction
    const txRes = await client.query(
      `INSERT INTO gincoin_transactions (wallet_id, type, amount, source, reference_id, description)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [wallet.id, type, amount, source, referenceId, description]
    );

    // Update wallet balance and totals
    const balanceDelta = type === 'earn' ? amount : -amount;
    const earnDelta = type === 'earn' ? amount : 0;
    const spentDelta = type === 'spend' ? amount : 0;

    const newTotalEarned = parseFloat(String(wallet.total_earned)) + earnDelta;
    const newLevel = calculateLevel(newTotalEarned);

    await client.query(
      `UPDATE gincoin_wallets
       SET balance = balance + $1,
           total_earned = total_earned + $2,
           total_spent = total_spent + $3,
           level = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [balanceDelta, earnDelta, spentDelta, newLevel, wallet.id]
    );

    await client.query('COMMIT');
    return txRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getBalance(userId: number): Promise<GinCoinWallet> {
  return getOrCreateWallet(userId);
}

export async function getTransactions(
  userId: number,
  page: number = 1,
  limit: number = 20
): Promise<{ data: GinCoinTransaction[]; total: number; page: number; limit: number }> {
  const wallet = await getOrCreateWallet(userId);

  const countRes = await query(
    'SELECT COUNT(*) FROM gincoin_transactions WHERE wallet_id = $1',
    [wallet.id]
  );
  const total = parseInt(countRes.rows[0].count, 10);

  const offset = (page - 1) * limit;
  const txRes = await query(
    `SELECT * FROM gincoin_transactions
     WHERE wallet_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [wallet.id, limit, offset]
  );

  return { data: txRes.rows, total, page, limit };
}

export async function awardOrderGinCoins(
  orderId: number,
  clientId: number,
  managerId: number,
  orderTotal: number,
  personalDiscount: number
): Promise<void> {
  // Award client
  const clientAmount = Math.round(orderTotal * personalDiscount / 100 * 100) / 100;
  if (clientAmount > 0) {
    // Clients are referenced by clients.id, but wallets use users.id
    // For clients, we use client_id as the user_id in the wallet system
    await addTransaction(
      clientId,
      'earn',
      clientAmount,
      'order',
      orderId,
      `GinCoins for order #${orderId} (${personalDiscount}% of ${orderTotal})`
    );
  }

  // Award manager
  const managerAmount = Math.round(orderTotal * 10 / 100 * 100) / 100;
  if (managerAmount > 0) {
    await addTransaction(
      managerId,
      'earn',
      managerAmount,
      'order',
      orderId,
      `Manager bonus for order #${orderId} (10% of ${orderTotal})`
    );
  }
}

export async function exchangeForProduct(
  userId: number,
  productId: number,
  quantity: number
): Promise<{ wallet: GinCoinWallet; transaction: GinCoinTransaction; product: Record<string, any> }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get wallet
    const walletRes = await client.query(
      `INSERT INTO gincoin_wallets (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING *`,
      [userId]
    );
    const wallet: GinCoinWallet = walletRes.rows[0];

    // Get product price
    const productRes = await client.query(
      'SELECT id, name, price FROM products WHERE id = $1 AND deleted_at IS NULL',
      [productId]
    );
    if (productRes.rows.length === 0) {
      throw ApiError.notFound('Product not found');
    }
    const product = productRes.rows[0];

    const cost = parseFloat(String(product.price)) * quantity;

    // Check balance
    if (parseFloat(String(wallet.balance)) < cost) {
      throw ApiError.badRequest('Insufficient GinCoin balance');
    }

    // Insert transaction
    const txRes = await client.query(
      `INSERT INTO gincoin_transactions (wallet_id, type, amount, source, reference_id, description)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [wallet.id, 'spend', cost, 'product_exchange', productId, `Exchange for ${quantity}x ${product.name}`]
    );

    // Update wallet
    const newTotalEarned = parseFloat(String(wallet.total_earned));
    const newLevel = calculateLevel(newTotalEarned);

    const updatedWalletRes = await client.query(
      `UPDATE gincoin_wallets
       SET balance = balance - $1,
           total_spent = total_spent + $1,
           level = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [cost, newLevel, wallet.id]
    );

    await client.query('COMMIT');
    return { wallet: updatedWalletRes.rows[0], transaction: txRes.rows[0], product };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function withdrawToCash(
  userId: number,
  amount: number
): Promise<{ wallet: GinCoinWallet; transaction: GinCoinTransaction }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get wallet
    const walletRes = await client.query(
      `INSERT INTO gincoin_wallets (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING *`,
      [userId]
    );
    const wallet: GinCoinWallet = walletRes.rows[0];

    // Check balance
    if (parseFloat(String(wallet.balance)) < amount) {
      throw ApiError.badRequest('Insufficient GinCoin balance');
    }

    // Insert transaction
    const txRes = await client.query(
      `INSERT INTO gincoin_transactions (wallet_id, type, amount, source, reference_id, description)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [wallet.id, 'withdraw', amount, 'cash_withdrawal', null, `Cash withdrawal of ${amount} GinCoins`]
    );

    // Update wallet
    const newTotalEarned = parseFloat(String(wallet.total_earned));
    const newLevel = calculateLevel(newTotalEarned);

    const updatedWalletRes = await client.query(
      `UPDATE gincoin_wallets
       SET balance = balance - $1,
           total_spent = total_spent + $1,
           level = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [amount, newLevel, wallet.id]
    );

    await client.query('COMMIT');
    return { wallet: updatedWalletRes.rows[0], transaction: txRes.rows[0] };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
