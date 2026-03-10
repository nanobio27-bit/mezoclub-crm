# Задачи для разработчика — MVP MezoClub CRM

## Как работать с этим проектом

1. Прочитай `CLAUDE.md` — это конституция проекта
2. Используй Claude Code для генерации кода
3. Skills (`.claude/skills/`) — готовые промпты для типовых задач
4. Типы (`src/shared/types/common.ts`) — уже описаны, используй их
5. Миграция (`migrations/001_initial.sql`) — уже написана
6. BaseRepository (`src/shared/database/base-repository.ts`) — наследуй от него

---

## Спринт 1: Backend MVP (неделя 1)

### Задача 1.1: Инициализация проекта [2ч]
```
- npm install
- cp .env.example .env (заполнить)
- docker-compose up -d (поднять БД)
- Проверить что миграция применилась
- Создать src/server/index.ts (Express app)
- Создать src/shared/database/pool.ts (подключение к PostgreSQL)
- Настроить middleware: cors, helmet, json parser, error handler
- Проверить: GET /health возвращает { status: 'ok' }
```

### Задача 1.2: Модуль авторизации [6ч]
```
Claude Code: /create-module auth

Файлы:
- src/modules/auth/routes.ts
  POST /api/auth/login      — вход по email + пароль
  POST /api/auth/register   — регистрация (только owner/admin может)
  POST /api/auth/refresh    — обновить access token
  GET  /api/auth/me          — текущий пользователь
  POST /api/auth/logout      — выход (инвалидация refresh token)

- src/modules/auth/service.ts
  login() — проверить пароль, создать токены
  register() — хешировать пароль, создать пользователя
  refreshToken() — ротация: старый revoked, новый создан
  
- src/shared/middleware/auth.ts
  authMiddleware — проверка JWT в Authorization header
  roleMiddleware(...roles) — проверка роли пользователя

Проверить: можно залогиниться через Swagger /api-docs
```

### Задача 1.3: Модуль клиентов [4ч]
```
Claude Code: /create-module clients

API:
  GET    /api/clients          — список с пагинацией, поиском
  GET    /api/clients/:id      — один клиент
  POST   /api/clients          — создать клиента
  PUT    /api/clients/:id      — обновить
  DELETE /api/clients/:id      — мягкое удаление

Особенности:
- Поиск по name, company, email, phone, city
- Фильтр по status, client_type, manager_id
- В ответе: manager_name (JOIN с users)

Проверить: CRUD работает через Swagger
```

### Задача 1.4: Модуль товаров [3ч]
```
Claude Code: /create-module products

API:
  GET    /api/products         — список товаров
  GET    /api/products/:id     — один товар
  POST   /api/products         — создать
  PUT    /api/products/:id     — обновить
  DELETE /api/products/:id     — мягкое удаление
  GET    /api/products/low-stock — товары с низким остатком

Особенности:
- Поиск по name, sku, brand
- Фильтр по category, is_active
- low-stock: WHERE stock_quantity <= min_stock_level

Проверить: CRUD + low-stock endpoint
```

### Задача 1.5: Модуль заказов [8ч]
```
Claude Code: /create-module orders

API:
  GET    /api/orders            — список заказов
  GET    /api/orders/:id        — заказ с позициями (items)
  POST   /api/orders            — создать заказ
  PUT    /api/orders/:id        — обновить заказ
  PUT    /api/orders/:id/status — изменить статус
  DELETE /api/orders/:id        — отменить (soft delete)

Особенности:
- При создании: рассчитать subtotal, total_amount из items
- При создании: проверить остатки товаров
- При подтверждении: уменьшить stock_quantity товаров
- При отмене: вернуть stock_quantity
- Смена статуса: валидация переходов (нельзя из delivered в new)
- В ответе: client_name, manager_name, items[]
- order_number генерируется автоматически (триггер в БД)

Допустимые переходы статусов:
  new → confirmed | cancelled
  confirmed → in_production | cancelled
  in_production → ready | cancelled
  ready → shipped | cancelled
  shipped → delivered | returned
  delivered → completed | returned

Проверить: полный цикл заказа от создания до завершения
```

### Задача 1.6: Dashboard API [3ч]
```
Claude Code: /create-module dashboard

API:
  GET /api/dashboard — сводные данные

Ответ (DashboardData из types):
- todayRevenue: SUM(total_amount) за сегодня
- todayRevenueChange: % vs вчера
- activeOrders: COUNT(*) WHERE status NOT IN (completed, cancelled)
- activeClients: COUNT(DISTINCT client_id) за последние 30 дней
- lowStockProducts: COUNT(*) WHERE stock <= min_stock
- recentOrders: последние 10 заказов с client_name
- topProducts: топ-5 по total_price за 30 дней
- ordersByStatus: GROUP BY status

Проверить: endpoint возвращает все данные
```

### Задача 1.7: Seed данные [2ч]
```
Создай src/shared/database/seed.ts

- 1 owner (Владимир Барсуков)
- 2 менеджера
- 20 клиентов (украинские имена, реальные города)
- 15 товаров MezoClub (AESSOA, GANA FILL и т.д. с реальными ценами)
- 30 заказов в разных статусах
- npm run seed — запуск
```

### Задача 1.8: Swagger документация [1ч]
```
- Настроить swagger-jsdoc
- Все роуты задокументированы
- Доступно по http://localhost:3001/api-docs
- Можно тестировать прямо из браузера
```

---

## Спринт 2: Frontend MVP (неделя 2)

### Задача 2.1: Настройка React [3ч]
```
- Vite + React + TypeScript + Tailwind
- API client (axios с JWT interceptors)
- Router: react-router-dom
- Stores: Zustand (auth), TanStack Query (data)
- i18n: react-i18next, язык по умолчанию ru, переключатель ru/uk в Header
- Словари уже готовы: src/client/locales/ru.json и uk.json
- Тёмная тема MezoClub (globals.css)
- Layout: Sidebar + Header (с переключателем языка) + Content
```

### Задача 2.2: Страница логина [2ч]
```
Claude Code: /build-frontend Login

- "Time to Live" анимация
- Форма: email + пароль
- Redirect на Dashboard после логина
```

### Задача 2.3: Dashboard [6ч]
```
Claude Code: /build-frontend Dashboard

- Quick Stats: 4 карточки вверху
- Последние заказы: таблица
- Топ товаров: горизонтальный bar chart
- Заказы по статусам: pie chart
- Товары с низким остатком: предупреждение
```

### Задача 2.4: Страница клиентов [4ч]
```
Claude Code: /build-frontend Clients
- Таблица, поиск, фильтры, CRUD
```

### Задача 2.5: Страница товаров [3ч]
```
Claude Code: /build-frontend Products
- Таблица, поиск, индикация низкого остатка
```

### Задача 2.6: Страница заказов [5ч]
```
Claude Code: /build-frontend Orders
- Таблица, фильтры по статусу
- Создание заказа: выбор клиента + добавление товаров
- Смена статуса: выпадающий список с валидацией
```

---

## Критерии приёмки MVP

- [ ] Можно зайти по логину/паролю
- [ ] Можно создать/изменить/удалить клиента
- [ ] Можно создать/изменить/удалить товар
- [ ] Можно создать заказ, выбрав клиента и товары
- [ ] Заказ проходит полный цикл статусов
- [ ] Dashboard показывает реальные цифры из БД
- [ ] Swagger документация доступна
- [ ] Seed данные загружаются
- [ ] `npm test` — тесты auth + orders проходят
- [ ] Docker-compose запускает БД одной командой
