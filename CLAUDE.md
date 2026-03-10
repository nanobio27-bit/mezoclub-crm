# MezoClub AGI CRM

> **«Time to Live»** (Время жить) — философия компании MezoClub

## О проекте

AI-powered CRM для дистрибьютора профессиональной косметики MezoClub (Украина).
B2B продажи косметологам: AESSOA, GANA FILL, TRINITYLIFT, CLAPIO, AMI EYES, PLARECETA, JIXIMTP36.

## Стек технологий

- **Backend:** Node.js 20, Express 5, TypeScript 5.4
- **Database:** PostgreSQL 16 (основная), Redis 7 (кэш + сессии)
- **Frontend:** React 19, Tailwind CSS 4, Recharts (графики)
- **Тесты:** Jest + Supertest
- **Контейнеры:** Docker + docker-compose

## Архитектура

### Структура папок (domain-driven)
```
src/
  modules/           — каждый домен = отдельная папка
    {domain}/
      types.ts       — интерфейсы и типы
      repository.ts  — SQL-запросы через BaseRepository
      service.ts     — бизнес-логика
      routes.ts      — Express маршруты
      index.ts       — реэкспорт
  shared/
    database/        — pool.ts, base-repository.ts
    types/           — общие типы (ApiError, Pagination)
    utils/           — хелперы (date, validation)
    middleware/       — auth, error-handler, rate-limit
  client/            — React SPA
  server/            — index.ts (точка входа)
```

### Правило: Каждый запрос проходит цепочку
```
Route → Middleware (auth, validation) → Service → Repository → PostgreSQL
```
Никогда не пиши SQL прямо в route handler. Всегда через Repository.

## Правила кодирования

### Общие
- Язык комментариев: **русский**
- Все строки: одинарные кавычки `'text'`
- Точки с запятой: **да**
- Отступы: **2 пробела**
- Именование файлов: kebab-case (`user-service.ts`)
- Именование классов: PascalCase (`UserService`)
- Именование функций/переменных: camelCase (`getActiveClients`)

### TypeScript
- Строгий режим: `strict: true`
- Всегда типизируй: нет `any` (только `unknown` если нужно)
- Интерфейсы предпочтительнее типов для объектов
- Enum через `as const` объекты, не TypeScript enum

### API
- RESTful: GET, POST, PUT, DELETE
- Формат ответа: `{ data, meta? }` для успеха
- Формат ошибки: `{ error, code, details?, requestId? }`
- Пагинация: `?page=1&limit=20` → `{ data: [...], meta: { total, page, limit, pages } }`
- Версионирование: пока нет (v1 по умолчанию)
- Swagger/OpenAPI: обновляй при каждом новом роуте

### База данных
- Все таблицы имеют: `id SERIAL PRIMARY KEY`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`
- Soft delete: `deleted_at TIMESTAMPTZ DEFAULT NULL` для всех бизнес-таблиц
- Индексы: добавляй `WHERE deleted_at IS NULL` для partial index
- Миграции: файлы в `migrations/`, каждый в транзакции (BEGIN/COMMIT)
- Именование таблиц: snake_case, множественное число (`order_items`)
- Foreign keys: всегда с `ON DELETE` стратегией

### Безопасность
- JWT Access Token TTL: 15 минут
- JWT Refresh Token TTL: 7 дней
- Пароли: bcrypt с salt rounds = 12
- Rate limiting: 5 попыток логина / 15 мин с одного IP
- Все input валидировать (express-validator или zod)

### Локализация (i18n)
- Язык по умолчанию: **русский (ru)**
- Доступные языки: русский (ru), украинский (uk)
- Все тексты интерфейса — ТОЛЬКО через систему переводов, НИКОГДА хардкод
- Библиотека: `react-i18next` + `i18next`
- Файлы переводов: `src/client/locales/ru.json`, `src/client/locales/uk.json`
- Переключение языка: кнопка в Header, сохраняется в localStorage
- API ошибки: тоже через i18n (сервер возвращает код ошибки, клиент переводит)
- Комментарии в коде: на русском (это для разработчиков, не для пользователей)
- Формат дат: `DD.MM.YYYY` (европейский)
- Валюта: `₴` (гривна), формат: `1 234,56 ₴`
- Разделитель тысяч: пробел. Десятичный: запятая.

**ПРАВИЛО: Ни одна строка текста в JSX не должна быть написана напрямую.**
```tsx
// ❌ НЕПРАВИЛЬНО
<button>Создать клиента</button>

// ✅ ПРАВИЛЬНО
<button>{t('clients.create')}</button>
```

### Фронтенд
- State management: Zustand (клиент) + TanStack Query (сервер)
- HTTP клиент: axios с interceptors для JWT refresh
- Дизайн: тёмная тема, Glassmorphism
  - Фон: `#0B0E14` (глубокий тёмный графит)
  - AI-Акцент 1: `#8B5CF6` (электрический фиолетовый)
  - AI-Акцент 2: `#06B6D4` (неоновый голубой)
  - Успех: `#10B981` (изумрудный неон)
  - Опасность: `#EF4444`
  - Предупреждение: `#F59E0B`
- Шрифты: JetBrains Mono (цифры, логи), Inter (текст)
- Границы: 1px solid rgba(255,255,255,0.1)
- На мобильных: fallback без backdrop-filter: blur()

## Роли пользователей

```
owner    — владелец MezoClub (полный доступ)
admin    — администратор CRM
manager  — менеджер отдела
sales    — менеджер продаж
logistics — логист
operator — оператор (только чтение + базовые действия)
viewer   — только просмотр
```

## Мультитенантность (закладка на будущее)

Архитектура готова к продаже CRM другим компаниям.
Модель: **shared database, shared schema** — одна БД, разделение по `tenant_id`.

### Как это работает
- Таблица `tenants` — список компаний (MezoClub, и в будущем другие)
- Все бизнес-таблицы имеют поле `tenant_id INTEGER NOT NULL`
- Middleware `tenantMiddleware` автоматически:
  1. Читает tenant_id из JWT токена пользователя
  2. Подставляет его во все запросы
- Каждый Repository добавляет `WHERE tenant_id = $X` автоматически

### Правила для разработки
- **КАЖДАЯ** бизнес-таблица (clients, orders, products, campaigns...) имеет `tenant_id`
- Исключения: users (привязаны к tenant через `user_tenants`), audit_logs, системные таблицы
- Никогда не делай запрос без `tenant_id` в WHERE
- BaseRepository добавляет tenant_id автоматически — не дублируй в модулях
- Seed данные: создаётся tenant 'mezoclub' с id=1

### Для MVP
Пока один тенант (MezoClub). Tenant_id = 1 везде. Но поле есть, middleware есть,
и когда придёт второй клиент — просто добавляем запись в tenants.

## MVP Scope (текущая фаза)

Делаем ТОЛЬКО эти модули:
1. `auth` — регистрация, логин, JWT, роли
2. `clients` — CRUD клиентов (клиники, косметологи)
3. `products` — CRUD товаров + остатки
4. `orders` — CRUD заказов + статусы + привязка к клиентам/товарам
5. `dashboard` — API для сводных данных

**НЕ делаем сейчас:** AI-агенты, интеграции (amoCRM, Nova Poshta, Monobank),
WebSocket, cron-задачи, GinCoin, Золотой час, G-Зеркало, VIP-бейджи.
Эти модули будут в следующих спринтах.

## Мультиязычность (i18n)

Интерфейс поддерживает несколько языков. По умолчанию — русский.

- Файлы переводов: `src/client/locales/{ru,uk,en}.json`
- Библиотека: `react-i18next`
- Ключи вложенные: `t('clients.statuses.active')` → «Активный» / «Активний»
- **Никогда не хардкодь текст в компонентах** — всегда через `t('key')`
- Язык пользователя хранится в `users.preferred_language`
- API ошибки: на языке из заголовка `Accept-Language`

## White-label (продажа CRM)

CRM проектируется для продажи другим компаниям.

- Конфиг тенанта: `src/shared/config/tenant.ts`
- Всё кастомизируемое — в конфиге: название, логотип, цвета, валюта, префикс заказа
- **Никогда не хардкодь «MezoClub»** в коде — бери из `getTenantConfig().companyName`
- Цвета темы: из `getTenantConfig().theme`, не захардкоженные hex-значения
- CSS-переменные для цветов: `var(--color-accent-primary)` вместо `#8B5CF6`
- Модули включаются/выключаются через `config.business.enabledModules`
- Будущие фичи (AI, GinCoin...) через `config.features.aiAgents`

## Тестирование

- Unit-тесты: для service и repository
- Integration-тесты: для API routes (supertest)
- Минимум: тесты для auth (логин, роли) и orders (CRUD + статусы)
- Команда: `npm test`
