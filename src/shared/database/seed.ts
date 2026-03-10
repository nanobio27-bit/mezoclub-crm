// src/shared/database/seed.ts
// Начальные данные для MezoClub CRM
// Запуск: npm run seed

import 'dotenv/config';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('🌱 Начинаем заполнение базы данных...\n');

  try {
    // === 1. Обновляем пароль владельца ===
    const ownerPassword = await bcrypt.hash('MezoClub2026!', SALT_ROUNDS);
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [ownerPassword, 'owner@mezoclub.com']
    );
    console.log('✅ Владелец: owner@mezoclub.com / MezoClub2026!');

    // === 2. Менеджеры ===
    const manager1Password = await bcrypt.hash('Manager123!', SALT_ROUNDS);
    const manager2Password = await bcrypt.hash('Manager123!', SALT_ROUNDS);

    const m1 = await pool.query(
      `INSERT INTO users (email, password_hash, name, roles, phone, preferred_language)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2
       RETURNING id`,
      ['ivan@mezoclub.com', manager1Password, 'Иван Петренко', '{manager,sales}', '+380501234567', 'uk']
    );

    const m2 = await pool.query(
      `INSERT INTO users (email, password_hash, name, roles, phone, preferred_language)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2
       RETURNING id`,
      ['olena@mezoclub.com', manager2Password, 'Олена Коваленко', '{manager,sales}', '+380671234567', 'ru']
    );

    const managerId1 = m1.rows[0].id;
    const managerId2 = m2.rows[0].id;

    // Привязка менеджеров к тенанту
    await pool.query(
      `INSERT INTO user_tenants (user_id, tenant_id, roles, is_default) VALUES ($1, 1, '{manager,sales}', true) ON CONFLICT DO NOTHING`,
      [managerId1]
    );
    await pool.query(
      `INSERT INTO user_tenants (user_id, tenant_id, roles, is_default) VALUES ($1, 1, '{manager,sales}', true) ON CONFLICT DO NOTHING`,
      [managerId2]
    );
    console.log('✅ Менеджеры: ivan@mezoclub.com, olena@mezoclub.com / Manager123!');

    // === 3. Клиенты (20 штук) ===
    const clients = [
      { name: 'Клініка "Естетік Плюс"', email: 'estetik@gmail.com', phone: '+380441234567', company: 'ТОВ Естетік Плюс', clientType: 'clinic', city: 'Київ', status: 'active', segment: 'VIP' },
      { name: 'Косметолог Марія Шевченко', email: 'maria.shev@gmail.com', phone: '+380501112233', company: null, clientType: 'cosmetologist', city: 'Львів', status: 'active', segment: 'standard' },
      { name: 'Клініка "Дерма Лайф"', email: 'dermalife@ukr.net', phone: '+380442223344', company: 'ТОВ Дерма Лайф', clientType: 'clinic', city: 'Одеса', status: 'active', segment: 'VIP' },
      { name: 'Косметолог Анна Бондаренко', email: 'anna.bond@gmail.com', phone: '+380671112233', company: null, clientType: 'cosmetologist', city: 'Харків', status: 'active', segment: 'standard' },
      { name: 'Клініка "Бьюті Хаус"', email: 'beautyhouse@gmail.com', phone: '+380443334455', company: 'ФОП Іванова', clientType: 'clinic', city: 'Дніпро', status: 'active', segment: 'standard' },
      { name: 'Косметолог Тетяна Мельник', email: 'tatiana.m@gmail.com', phone: '+380502223344', company: null, clientType: 'cosmetologist', city: 'Запоріжжя', status: 'new', segment: 'new' },
      { name: 'Клініка "Нова Шкіра"', email: 'novashkira@ukr.net', phone: '+380444445566', company: 'ТОВ Нова Шкіра', clientType: 'clinic', city: 'Вінниця', status: 'active', segment: 'VIP' },
      { name: 'Дистриб\'ютор "ФармаБьюті"', email: 'pharma@beauty.ua', phone: '+380445556677', company: 'ТОВ ФармаБьюті', clientType: 'distributor', city: 'Київ', status: 'active', segment: 'VIP' },
      { name: 'Косметолог Оксана Литвин', email: 'oksana.l@gmail.com', phone: '+380503334455', company: null, clientType: 'cosmetologist', city: 'Полтава', status: 'active', segment: 'standard' },
      { name: 'Клініка "Скін Кер"', email: 'skincare@clinic.ua', phone: '+380446667788', company: 'ТОВ Скін Кер', clientType: 'clinic', city: 'Миколаїв', status: 'inactive', segment: 'standard' },
      { name: 'Косметолог Юлія Кравченко', email: 'yulia.k@gmail.com', phone: '+380674445566', company: null, clientType: 'cosmetologist', city: 'Чернігів', status: 'new', segment: 'new' },
      { name: 'Клініка "Аура Б\'юті"', email: 'aura@beauty.ua', phone: '+380447778899', company: 'ФОП Петренко', clientType: 'clinic', city: 'Суми', status: 'active', segment: 'standard' },
      { name: 'Косметолог Наталія Ткаченко', email: 'natalia.t@gmail.com', phone: '+380505556677', company: null, clientType: 'cosmetologist', city: 'Житомир', status: 'active', segment: 'standard' },
      { name: 'Клініка "Гламур"', email: 'glamour@clinic.ua', phone: '+380448889900', company: 'ТОВ Гламур', clientType: 'clinic', city: 'Рівне', status: 'active', segment: 'VIP' },
      { name: 'Косметолог Ірина Савченко', email: 'irina.s@gmail.com', phone: '+380676667788', company: null, clientType: 'cosmetologist', city: 'Тернопіль', status: 'lost', segment: 'standard' },
      { name: 'Клініка "Медестетика"', email: 'medestetika@ukr.net', phone: '+380449990011', company: 'ТОВ Медестетика', clientType: 'clinic', city: 'Хмельницький', status: 'active', segment: 'standard' },
      { name: 'Косметолог Вікторія Лисенко', email: 'victoria.l@gmail.com', phone: '+380507778899', company: null, clientType: 'cosmetologist', city: 'Черкаси', status: 'active', segment: 'standard' },
      { name: 'Клініка "Лазер Клуб"', email: 'laserclub@gmail.com', phone: '+380440011122', company: 'ФОП Сидоренко', clientType: 'clinic', city: 'Кропивницький', status: 'new', segment: 'new' },
      { name: 'Дистриб\'ютор "КосмоТрейд"', email: 'cosmotrade@ua.com', phone: '+380441122233', company: 'ТОВ КосмоТрейд', clientType: 'distributor', city: 'Київ', status: 'active', segment: 'VIP' },
      { name: 'Косметолог Дарія Павленко', email: 'daria.p@gmail.com', phone: '+380678889900', company: null, clientType: 'cosmetologist', city: 'Івано-Франківськ', status: 'active', segment: 'standard' },
    ];

    const clientIds: number[] = [];
    for (let i = 0; i < clients.length; i++) {
      const c = clients[i];
      const managerId = i % 2 === 0 ? managerId1 : managerId2;
      const result = await pool.query(
        `INSERT INTO clients (tenant_id, name, email, phone, company, client_type, city, status, segment, manager_id, source)
         VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [c.name, c.email, c.phone, c.company, c.clientType, c.city, c.status, c.segment, managerId, 'seed']
      );
      clientIds.push(result.rows[0].id);
    }
    console.log(`✅ Клиенты: ${clientIds.length} записей`);

    // === 4. Товары MezoClub (15 штук) ===
    const products = [
      { name: 'AESSOA Fine', sku: 'AES-FINE-01', brand: 'AESSOA', category: 'filler', price: 2800, costPrice: 1400, stock: 45, unit: 'шт', desc: 'Филлер для тонких линий и мелких морщин, 1 мл' },
      { name: 'AESSOA Deep', sku: 'AES-DEEP-01', brand: 'AESSOA', category: 'filler', price: 3200, costPrice: 1600, stock: 30, unit: 'шт', desc: 'Филлер для глубоких морщин и контуров лица, 1 мл' },
      { name: 'AESSOA Volume', sku: 'AES-VOL-01', brand: 'AESSOA', category: 'filler', price: 3500, costPrice: 1750, stock: 25, unit: 'шт', desc: 'Волюмайзер для увеличения объёма, 1 мл' },
      { name: 'GANA FILL Medium', sku: 'GF-MED-01', brand: 'GANA FILL', category: 'filler', price: 2500, costPrice: 1250, stock: 50, unit: 'шт', desc: 'Филлер средней плотности для коррекции морщин' },
      { name: 'GANA FILL Deep', sku: 'GF-DEEP-01', brand: 'GANA FILL', category: 'filler', price: 2900, costPrice: 1450, stock: 35, unit: 'шт', desc: 'Филлер высокой плотности для моделирования' },
      { name: 'TRINITYLIFT Thread COG', sku: 'TL-COG-01', brand: 'TRINITYLIFT', category: 'thread', price: 4500, costPrice: 2250, stock: 20, unit: 'упаковка', desc: 'Нити для лифтинга с насечками, 10 шт в упаковке' },
      { name: 'TRINITYLIFT Thread Mono', sku: 'TL-MONO-01', brand: 'TRINITYLIFT', category: 'thread', price: 2200, costPrice: 1100, stock: 40, unit: 'упаковка', desc: 'Мононити для армирования, 20 шт в упаковке' },
      { name: 'CLAPIO Biorevitalizant', sku: 'CL-BIO-01', brand: 'CLAPIO', category: 'biorevitalizant', price: 1800, costPrice: 900, stock: 60, unit: 'шт', desc: 'Биоревитализант с гиалуроновой кислотой, 2 мл' },
      { name: 'CLAPIO Meso Cocktail', sku: 'CL-MESO-01', brand: 'CLAPIO', category: 'mesotherapy', price: 1500, costPrice: 750, stock: 8, unit: 'шт', desc: 'Мезококтейль для лица, витамины + пептиды' },
      { name: 'AMI EYES', sku: 'AMI-EYE-01', brand: 'AMI EYES', category: 'filler', price: 3800, costPrice: 1900, stock: 15, unit: 'шт', desc: 'Специализированный филлер для зоны вокруг глаз' },
      { name: 'PLARECETA Placental Extract', sku: 'PL-EXT-01', brand: 'PLARECETA', category: 'biorevitalizant', price: 5200, costPrice: 2600, stock: 12, unit: 'шт', desc: 'Плацентарный экстракт для регенерации кожи' },
      { name: 'PLARECETA Serum', sku: 'PL-SER-01', brand: 'PLARECETA', category: 'cosmetic', price: 1200, costPrice: 600, stock: 5, unit: 'шт', desc: 'Сыворотка с плацентарными пептидами' },
      { name: 'JIXIMTP36 Peptide Complex', sku: 'JX-PEP-01', brand: 'JIXIMTP36', category: 'mesotherapy', price: 2100, costPrice: 1050, stock: 30, unit: 'шт', desc: 'Пептидный комплекс для мезотерапии' },
      { name: 'GANA FILL Lips', sku: 'GF-LIPS-01', brand: 'GANA FILL', category: 'filler', price: 2700, costPrice: 1350, stock: 3, unit: 'шт', desc: 'Филлер для увеличения и контурирования губ' },
      { name: 'AESSOA Skin Booster', sku: 'AES-BOOST-01', brand: 'AESSOA', category: 'biorevitalizant', price: 2000, costPrice: 1000, stock: 55, unit: 'шт', desc: 'Скин-бустер для глубокого увлажнения кожи' },
    ];

    const productIds: number[] = [];
    for (const p of products) {
      const result = await pool.query(
        `INSERT INTO products (tenant_id, name, sku, brand, category, description, price, cost_price, stock_quantity, min_stock_level, unit)
         VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, 10, $9)
         RETURNING id`,
        [p.name, p.sku, p.brand, p.category, p.desc, p.price, p.costPrice, p.stock, p.unit]
      );
      productIds.push(result.rows[0].id);
    }
    console.log(`✅ Товары: ${productIds.length} записей`);

    // === 5. Заказы (30 штук в разных статусах) ===
    const statuses = [
      'new', 'new', 'new', 'new', 'new',
      'confirmed', 'confirmed', 'confirmed', 'confirmed',
      'in_production', 'in_production', 'in_production',
      'ready', 'ready', 'ready',
      'shipped', 'shipped', 'shipped',
      'delivered', 'delivered', 'delivered',
      'completed', 'completed', 'completed', 'completed', 'completed',
      'cancelled', 'cancelled',
      'returned', 'returned',
    ];

    let orderCount = 0;
    for (let i = 0; i < 30; i++) {
      const clientId = clientIds[i % clientIds.length];
      const managerId = i % 2 === 0 ? managerId1 : managerId2;
      const status = statuses[i];

      // 1-3 позиции в заказе
      const itemCount = (i % 3) + 1;
      const items: { productId: number; quantity: number; unitPrice: number; totalPrice: number; productName: string }[] = [];
      let subtotal = 0;

      for (let j = 0; j < itemCount; j++) {
        const pIdx = (i + j) % productIds.length;
        const product = products[pIdx];
        const quantity = (j + 1) * 2;
        const unitPrice = product.price;
        const totalPrice = quantity * unitPrice;
        subtotal += totalPrice;
        items.push({
          productId: productIds[pIdx],
          quantity,
          unitPrice,
          totalPrice,
          productName: product.name,
        });
      }

      const totalAmount = subtotal;

      // Даты для разных статусов
      const daysAgo = 30 - i;
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      const extraFields: Record<string, unknown> = {};
      if (['confirmed', 'in_production', 'ready', 'shipped', 'delivered', 'completed'].includes(status)) {
        const confirmedAt = new Date(createdAt);
        confirmedAt.setHours(confirmedAt.getHours() + 2);
        extraFields.confirmed_at = confirmedAt.toISOString();
      }
      if (['shipped', 'delivered', 'completed'].includes(status)) {
        const shippedAt = new Date(createdAt);
        shippedAt.setDate(shippedAt.getDate() + 1);
        extraFields.shipped_at = shippedAt.toISOString();
      }
      if (['delivered', 'completed'].includes(status)) {
        const deliveredAt = new Date(createdAt);
        deliveredAt.setDate(deliveredAt.getDate() + 3);
        extraFields.delivered_at = deliveredAt.toISOString();
      }

      const paymentStatus = ['completed', 'delivered'].includes(status) ? 'paid' :
        ['shipped', 'ready'].includes(status) ? 'partial' :
        status === 'cancelled' ? 'pending' : 'pending';

      const paidAmount = paymentStatus === 'paid' ? totalAmount :
        paymentStatus === 'partial' ? Math.round(totalAmount * 0.5) : 0;

      const orderResult = await pool.query(
        `INSERT INTO orders (tenant_id, client_id, manager_id, status, payment_status,
           subtotal, discount_amount, total_amount, paid_amount,
           delivery_type, delivery_city, notes,
           confirmed_at, shipped_at, delivered_at, created_at)
         VALUES (1, $1, $2, $3, $4, $5, 0, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id`,
        [
          clientId, managerId, status, paymentStatus,
          subtotal, totalAmount, paidAmount,
          'nova_poshta', clients[i % clients.length].city,
          `Seed заказ #${i + 1}`,
          extraFields.confirmed_at || null,
          extraFields.shipped_at || null,
          extraFields.delivered_at || null,
          createdAt.toISOString(),
        ]
      );

      const orderId = orderResult.rows[0].id;

      // Позиции заказа
      for (const item of items) {
        await pool.query(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, discount_percent, total_price)
           VALUES ($1, $2, $3, $4, $5, 0, $6)`,
          [orderId, item.productId, item.productName, item.quantity, item.unitPrice, item.totalPrice]
        );
      }

      orderCount++;
    }
    console.log(`✅ Заказы: ${orderCount} записей`);

    // === 6. Обновляем денормализованные поля клиентов ===
    await pool.query(`
      UPDATE clients SET
        total_orders = sub.cnt,
        total_revenue = sub.rev,
        last_order_at = sub.last_at
      FROM (
        SELECT client_id,
          COUNT(*)::integer as cnt,
          COALESCE(SUM(total_amount), 0) as rev,
          MAX(created_at) as last_at
        FROM orders
        WHERE deleted_at IS NULL AND status != 'cancelled'
        GROUP BY client_id
      ) sub
      WHERE clients.id = sub.client_id
    `);
    console.log('✅ Денормализованные поля клиентов обновлены');

    console.log('\n🎉 Seed завершён успешно!\n');
    console.log('Учётные записи для входа:');
    console.log('  Владелец: owner@mezoclub.com / MezoClub2026!');
    console.log('  Менеджер 1: ivan@mezoclub.com / Manager123!');
    console.log('  Менеджер 2: olena@mezoclub.com / Manager123!');

  } catch (error) {
    console.error('❌ Ошибка seed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
