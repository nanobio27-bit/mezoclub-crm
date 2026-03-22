import Anthropic from '@anthropic-ai/sdk';
import { query } from '../../shared/database/pool';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ClientContext {
  client: {
    name: string;
    company: string;
    segment: string;
    personal_discount: number;
  };
  orders: {
    date: string;
    total: number;
    products: string[];
  }[];
  catalog: {
    name: string;
    price: number;
    category: string;
    brand: string;
    stock: number;
  }[];
}

async function getClientContext(clientId: number): Promise<ClientContext> {
  const clientRes = await query(
    'SELECT name, company, segment, personal_discount FROM clients WHERE id = $1 AND deleted_at IS NULL',
    [clientId]
  );
  const client = clientRes.rows[0];
  if (!client) throw new Error('Client not found');

  const ordersRes = await query(
    `SELECT o.created_at, o.total_amount,
       (SELECT json_agg(p.name) FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = o.id) as products
     FROM orders o
     WHERE o.client_id = $1 AND o.deleted_at IS NULL
     ORDER BY o.created_at DESC LIMIT 20`,
    [clientId]
  );

  const catalogRes = await query(
    `SELECT name, price, category, brand, stock_quantity as stock
     FROM products
     WHERE deleted_at IS NULL AND is_active = true AND stock_quantity > 0
     ORDER BY category, name`
  );

  return {
    client: {
      name: client.name,
      company: client.company || '',
      segment: client.segment || '',
      personal_discount: parseFloat(client.personal_discount) || 0,
    },
    orders: ordersRes.rows.map((o: any) => ({
      date: new Date(o.created_at).toLocaleDateString('ru-RU'),
      total: parseFloat(o.total_amount),
      products: o.products || [],
    })),
    catalog: catalogRes.rows.map((p: any) => ({
      name: p.name,
      price: parseFloat(p.price),
      category: p.category,
      brand: p.brand,
      stock: p.stock,
    })),
  };
}

export async function getRecommendation(clientId: number, managerQuestion?: string): Promise<string> {
  const ctx = await getClientContext(clientId);

  const systemPrompt = `Ти — Rocco, AI-менеджер з продажу косметологічної продукції компанії MezoClub.
Ти допомагаєш менеджерам підбирати продукти для клієнтів.

Правила:
- Відповідай українською мовою
- Будь конкретним: називай продукти, ціни, кількість
- Враховуй історію покупок клієнта
- Пропонуй cross-sell та upsell
- Якщо клієнт давно не купував — запропонуй повторне замовлення
- Максимум 3-4 рекомендації
- Формат: короткий, по суті, як порада колезі-менеджеру`;

  const orderHistory = ctx.orders.length > 0
    ? ctx.orders.map(o => `  ${o.date}: ${o.products.join(', ')} — ${o.total}₴`).join('\n')
    : '  Замовлень ще немає';

  const catalogByCategory: Record<string, string[]> = {};
  for (const p of ctx.catalog) {
    const cat = p.category || 'other';
    if (!catalogByCategory[cat]) catalogByCategory[cat] = [];
    catalogByCategory[cat].push(`${p.name} ($${p.price})`);
  }
  const catalogText = Object.entries(catalogByCategory)
    .map(([cat, items]) => `  ${cat}: ${items.join(', ')}`)
    .join('\n');

  const userMessage = `Клієнт: ${ctx.client.name}
Компанія: ${ctx.client.company || '—'}
Сегмент: ${ctx.client.segment || '—'}
Персональна знижка: ${ctx.client.personal_discount}%

Історія замовлень:
${orderHistory}

Каталог (в наявності):
${catalogText}

${managerQuestion ? `Питання менеджера: ${managerQuestion}` : 'Дай рекомендації: що запропонувати цьому клієнту?'}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock ? textBlock.text : 'Немає відповіді';
}
