# Changelog — MezoClub CRM

## Sprint 2: Frontend MVP (в процессе)

**Ветка:** `claude/explore-frontend-structure-0R2dH`
**Дата:** 2026-03-20

---

### Задача 2.1: Настройка React — ВЫПОЛНЕНО

**Коммит:** `e5b397f` — feat: создать React фронтенд с Vite и подключением к бэкенду

Создана полная инфраструктура клиентского приложения:

**Новые файлы:**
| Файл | Описание |
|------|----------|
| `index.html` | Точка входа HTML, подключение шрифтов Inter и JetBrains Mono |
| `vite.config.ts` | Конфигурация Vite: React, Tailwind CSS 4, прокси `/api` → `localhost:3001` |
| `tsconfig.client.json` | Отдельный tsconfig для клиента (React JSX, DOM types) |
| `vite-env.d.ts` | Типы Vite для TypeScript |
| `src/client/main.tsx` | Точка входа React — рендерит App с i18n |
| `src/client/App.tsx` | Роутинг: LoginPage, DashboardPage, ProtectedRoute |
| `src/client/app.css` | CSS-переменные тёмной темы MezoClub (Glassmorphism) |
| `src/client/i18n.ts` | Конфигурация i18next (русский по умолчанию, украинский) |
| `src/client/pages/LoginPage.tsx` | Страница входа: email + пароль + переключатель языка |
| `src/client/pages/DashboardPage.tsx` | Заглушка дашборда (после авторизации) |
| `src/client/services/api-client.ts` | Axios с JWT interceptors и auto-refresh токенов |
| `src/client/stores/auth-store.ts` | Zustand store: login, logout, checkAuth |

**Установленные пакеты:**
- `react`, `react-dom`, `react-router-dom` — UI и роутинг
- `zustand` — state management
- `axios` — HTTP-клиент
- `i18next`, `react-i18next` — локализация
- `@vitejs/plugin-react`, `@tailwindcss/vite` — сборка
- `tailwindcss` v4 — стили

**CSS-переменные тёмной темы:**
```css
--color-bg-primary: #0B0E14       /* глубокий тёмный графит */
--color-accent-primary: #8B5CF6   /* электрический фиолетовый */
--color-accent-secondary: #06B6D4 /* неоновый голубой */
--color-success: #10B981          /* изумрудный неон */
--color-danger: #EF4444
--color-warning: #F59E0B
```

---

### Задача 2.2: Страница логина — ВЫПОЛНЕНО

**Коммиты:**
- `a458719` — fix: улучшить обработку ошибок логина и отключить Google Translate
- `33b0975` — fix: защита LoginPage от Google Translate + диагностика бэкенда

**Что сделано:**
- Форма входа: email + пароль с валидацией
- Переключатель языка (русский / українська)
- Redirect на Dashboard после успешного логина
- Таймаут 10с на API-запросы (не зависает при мёртвом бэкенде)
- Обработка ошибок: `NETWORK_ERROR`, `AUTH_INVALID_CREDENTIALS`, `AUTH_ACCOUNT_DISABLED`
- SVG-спиннер при загрузке
- Кнопка диагностики бэкенда
- Защита от Google Translate (`translate="no"`, `<meta name="google" content="notranslate">`)
- `autoComplete` атрибуты на полях ввода

---

### Исправление миграции — ВЫПОЛНЕНО

**Коммит:** `8de49c2` — fix: добавить INSERT INTO tenants в миграцию + правильный bcrypt хеш

**Проблема:** Миграция `001_initial.sql` падала с FK constraint error:
1. Не было `INSERT INTO tenants` — тенант MezoClub никогда не создавался
2. `user_tenants` ссылался на `tenant_id=1`, которого не существовало
3. Пароль был `$2b$12$placeholder_hash` — невалидный bcrypt хеш

**Решение:**
- Добавлен `INSERT INTO tenants ('MezoClub', 'mezoclub', true)`
- Заменён placeholder на реальный bcrypt хеш для пароля `MezoClub2026!`

---

### Инфраструктура (выполнено в сессии, не в коде)

| Действие | Описание |
|----------|----------|
| Создан `.env` | DATABASE_URL, JWT_SECRET, PORT=3001, NODE_ENV=development |
| Запущен PostgreSQL 16 | `pg_ctlcluster 16 main start` |
| Создана БД | `mezoclub_crm`, пользователь `mezoclub` |
| Выполнена миграция | `psql $DATABASE_URL -f migrations/001_initial.sql` |
| Выполнен seed | 3 пользователя, 20 клиентов, 15 товаров, 30 заказов |

**Учётные записи:**
| Роль | Email | Пароль |
|------|-------|--------|
| Владелец | `owner@mezoclub.com` | `MezoClub2026!` |
| Менеджер 1 | `ivan@mezoclub.com` | `Manager123!` |
| Менеджер 2 | `olena@mezoclub.com` | `Manager123!` |

---

### Обновлённые переводы

Добавлены новые ключи в `ru.json` / `uk.json`:
```
errors.NETWORK_ERROR       — "Бэкенд недоступен. Запустите: npm run dev"
errors.AUTH_ACCOUNT_DISABLED — "Аккаунт деактивирован"
errors.AUTH_NO_TENANT       — "Пользователь не привязан к организации"
errors.VALIDATION_ERROR     — "Ошибка валидации данных"
```

---

### Что осталось по Спринту 2

| Задача | Статус |
|--------|--------|
| 2.1 Настройка React | ВЫПОЛНЕНО |
| 2.2 Страница логина | ВЫПОЛНЕНО |
| 2.3 Dashboard (карточки, графики) | НЕ НАЧАТО |
| 2.4 Страница клиентов (CRUD) | НЕ НАЧАТО |
| 2.5 Страница товаров | НЕ НАЧАТО |
| 2.6 Страница заказов | НЕ НАЧАТО |

---

### Как запустить

```bash
# 1. Запустить PostgreSQL (если остановлен)
pg_ctlcluster 16 main start

# 2. Бэкенд (терминал 1)
npm run dev

# 3. Фронтенд (терминал 2)
npm run dev:client

# 4. Открыть http://localhost:5173/login
# Логин: owner@mezoclub.com / MezoClub2026!
```

### Известные проблемы

1. **Google Translate ломает React DOM** — отключите переводчик Chrome для localhost
2. **PostgreSQL падает** при перезагрузке среды — запустить `pg_ctlcluster 16 main start`
3. **Бэкенд умирает** при закрытии терминала — нужен process manager (pm2) для продакшена
