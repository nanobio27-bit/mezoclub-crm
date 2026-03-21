#!/usr/bin/env python3
# Генерация PDF-отчёта о проделанной работе MezoClub CRM
from fpdf import FPDF

class Report(FPDF):
    def __init__(self):
        super().__init__()
        # Шрифт с кириллицей
        self.add_font('DejaVu', '', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', uni=True)
        self.add_font('DejaVu', 'B', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', uni=True)
        self.add_font('Mono', '', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', uni=True)
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        self.set_font('DejaVu', 'B', 10)
        self.set_text_color(130, 92, 246)
        self.cell(0, 8, 'MezoClub CRM — Отчёт о разработке', align='R')
        self.ln(12)

    def footer(self):
        self.set_y(-15)
        self.set_font('DejaVu', '', 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f'Страница {self.page_no()}/{{nb}}', align='C')

    def title_page(self):
        self.add_page()
        self.ln(50)
        self.set_font('DejaVu', 'B', 28)
        self.set_text_color(130, 92, 246)
        self.cell(0, 15, 'MezoClub CRM', align='C')
        self.ln(18)
        self.set_font('DejaVu', '', 14)
        self.set_text_color(100, 100, 100)
        self.cell(0, 10, 'Time to Live — Время жить', align='C')
        self.ln(30)
        self.set_font('DejaVu', 'B', 18)
        self.set_text_color(40, 40, 40)
        self.cell(0, 12, 'Отчёт о проделанной работе', align='C')
        self.ln(12)
        self.set_font('DejaVu', '', 12)
        self.set_text_color(80, 80, 80)
        self.cell(0, 10, 'Sprint 1 (Backend) + Sprint 2 (Frontend)', align='C')
        self.ln(8)
        self.cell(0, 10, 'Дата: 20 марта 2026', align='C')
        self.ln(30)
        self.set_font('DejaVu', '', 10)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, 'Ветка: claude/explore-frontend-structure-0R2dH', align='C')

    def section(self, title):
        self.ln(6)
        self.set_font('DejaVu', 'B', 14)
        self.set_text_color(130, 92, 246)
        self.cell(0, 10, title)
        self.ln(8)
        # Линия под заголовком
        self.set_draw_color(130, 92, 246)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def subsection(self, title):
        self.ln(3)
        self.set_font('DejaVu', 'B', 11)
        self.set_text_color(6, 182, 212)
        self.cell(0, 8, title)
        self.ln(7)

    def body_text(self, text):
        self.set_font('DejaVu', '', 10)
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 6, text)
        self.ln(2)

    def bullet(self, text):
        self.set_font('DejaVu', '', 10)
        self.set_text_color(50, 50, 50)
        x = self.get_x()
        self.cell(6, 6, '•')
        self.multi_cell(0, 6, text)
        self.ln(1)

    def code_block(self, text):
        self.set_font('Mono', '', 8)
        self.set_fill_color(240, 240, 245)
        self.set_text_color(40, 40, 40)
        y_start = self.get_y()
        self.multi_cell(0, 5, text, fill=True)
        self.ln(3)

    def table_row(self, col1, col2, bold=False):
        style = 'B' if bold else ''
        self.set_font('DejaVu', style, 9)
        if bold:
            self.set_fill_color(130, 92, 246)
            self.set_text_color(255, 255, 255)
        else:
            self.set_fill_color(248, 248, 252)
            self.set_text_color(50, 50, 50)
        self.cell(70, 7, col1, border=1, fill=True)
        self.cell(0, 7, col2, border=1, fill=not bold)
        self.ln()

    def status_badge(self, text, done=True):
        if done:
            self.set_text_color(16, 185, 129)
            badge = '✓ ' + text
        else:
            self.set_text_color(245, 158, 11)
            badge = '○ ' + text
        self.set_font('DejaVu', 'B', 10)
        self.cell(0, 7, badge)
        self.ln(6)


def main():
    pdf = Report()
    pdf.alias_nb_pages()

    # === ТИТУЛЬНАЯ СТРАНИЦА ===
    pdf.title_page()

    # === СПРИНТ 1: BACKEND ===
    pdf.add_page()
    pdf.section('Спринт 1: Backend MVP')
    pdf.body_text('Полностью реализован серверный API на Node.js + Express + TypeScript + PostgreSQL. Все 8 задач выполнены.')

    pdf.subsection('Задача 1.1: Инициализация проекта')
    pdf.status_badge('ВЫПОЛНЕНО')
    pdf.bullet('Express 5 сервер с TypeScript (src/server/index.ts)')
    pdf.bullet('Подключение к PostgreSQL через пул соединений (pg)')
    pdf.bullet('Middleware: cors, helmet, json parser, rate-limit, error-handler')
    pdf.bullet('Health check endpoint: GET /health')
    pdf.bullet('Docker-compose: PostgreSQL 16 + Redis 7')

    pdf.subsection('Задача 1.2: Модуль авторизации')
    pdf.status_badge('ВЫПОЛНЕНО')
    pdf.bullet('POST /api/auth/login — вход по email + пароль (bcrypt, 12 salt rounds)')
    pdf.bullet('POST /api/auth/register — регистрация (только owner/admin)')
    pdf.bullet('POST /api/auth/refresh — ротация refresh токенов')
    pdf.bullet('GET /api/auth/me — текущий пользователь из JWT')
    pdf.bullet('POST /api/auth/logout — инвалидация refresh token')
    pdf.bullet('JWT Access Token: 15 минут, Refresh Token: 7 дней')
    pdf.bullet('authMiddleware + roleMiddleware для защиты роутов')
    pdf.bullet('Zod-валидация входных данных')

    pdf.subsection('Задача 1.3: Модуль клиентов')
    pdf.status_badge('ВЫПОЛНЕНО')
    pdf.bullet('CRUD: GET/POST/PUT/DELETE /api/clients')
    pdf.bullet('Пагинация, поиск по name/company/email/phone/city')
    pdf.bullet('Фильтрация по status, client_type, manager_id')
    pdf.bullet('Soft delete (deleted_at)')
    pdf.bullet('JOIN с users для manager_name')

    pdf.subsection('Задача 1.4: Модуль товаров')
    pdf.status_badge('ВЫПОЛНЕНО')
    pdf.bullet('CRUD: GET/POST/PUT/DELETE /api/products')
    pdf.bullet('GET /api/products/low-stock — товары с низким остатком')
    pdf.bullet('Поиск по name, sku, brand; фильтр по category')

    pdf.subsection('Задача 1.5: Модуль заказов')
    pdf.status_badge('ВЫПОЛНЕНО')
    pdf.bullet('CRUD: GET/POST/PUT/DELETE /api/orders')
    pdf.bullet('PUT /api/orders/:id/status — смена статуса с валидацией переходов')
    pdf.bullet('Автоматический расчёт subtotal и total_amount')
    pdf.bullet('Проверка остатков при создании, списание при подтверждении')
    pdf.bullet('Возврат остатков при отмене')
    pdf.bullet('Автогенерация order_number (триггер в БД)')
    pdf.body_text('Допустимые переходы: new→confirmed→in_production→ready→shipped→delivered→completed. Отмена возможна до отправки.')

    pdf.subsection('Задача 1.6: Dashboard API')
    pdf.status_badge('ВЫПОЛНЕНО')
    pdf.bullet('GET /api/dashboard — сводные данные')
    pdf.bullet('todayRevenue + процент изменения vs вчера')
    pdf.bullet('activeOrders, activeClients, lowStockProducts')
    pdf.bullet('recentOrders (10 последних), topProducts (топ-5)')
    pdf.bullet('ordersByStatus (группировка)')

    pdf.subsection('Задача 1.7: Seed данные')
    pdf.status_badge('ВЫПОЛНЕНО')
    pdf.bullet('1 владелец: owner@mezoclub.com / MezoClub2026!')
    pdf.bullet('2 менеджера: ivan@mezoclub.com, olena@mezoclub.com / Manager123!')
    pdf.bullet('20 клиентов (украинские имена, реальные города)')
    pdf.bullet('15 товаров MezoClub (AESSOA, GANA FILL, TRINITYLIFT и др.)')
    pdf.bullet('30 заказов в разных статусах')
    pdf.bullet('Команда: npm run seed')

    pdf.subsection('Задача 1.8: Swagger документация')
    pdf.status_badge('ВЫПОЛНЕНО')
    pdf.bullet('swagger-jsdoc + swagger-ui-express')
    pdf.bullet('Все роуты задокументированы с примерами')
    pdf.bullet('Доступно: http://localhost:3001/api-docs')

    # === СПРИНТ 2: FRONTEND ===
    pdf.add_page()
    pdf.section('Спринт 2: Frontend MVP')
    pdf.body_text('Начата реализация клиентской части. Выполнены задачи 2.1 и 2.2.')

    pdf.subsection('Задача 2.1: Настройка React')
    pdf.status_badge('ВЫПОЛНЕНО')
    pdf.body_text('Создана полная инфраструктура клиентского приложения:')

    pdf.ln(2)
    pdf.table_row('Файл', 'Описание', bold=True)
    pdf.table_row('index.html', 'HTML точка входа, шрифты Inter + JetBrains Mono')
    pdf.table_row('vite.config.ts', 'Vite: React, Tailwind 4, прокси /api → :3001')
    pdf.table_row('tsconfig.client.json', 'Отдельный tsconfig для React')
    pdf.table_row('src/client/main.tsx', 'Точка входа React + i18n')
    pdf.table_row('src/client/App.tsx', 'Роутинг: Login, Dashboard, ProtectedRoute')
    pdf.table_row('src/client/app.css', 'CSS-переменные тёмной темы Glassmorphism')
    pdf.table_row('src/client/i18n.ts', 'i18next: русский + украинский')
    pdf.table_row('api-client.ts', 'Axios + JWT interceptors + auto-refresh')
    pdf.table_row('auth-store.ts', 'Zustand: login, logout, checkAuth')

    pdf.ln(4)
    pdf.body_text('Установленные пакеты: react 19, react-dom, react-router-dom, zustand, axios, i18next, react-i18next, tailwindcss 4, @vitejs/plugin-react, @tailwindcss/vite')

    pdf.subsection('Задача 2.2: Страница логина')
    pdf.status_badge('ВЫПОЛНЕНО')
    pdf.bullet('Форма входа: email + пароль с HTML5 валидацией')
    pdf.bullet('Переключатель языка (русский / українська)')
    pdf.bullet('Redirect на Dashboard после успешного входа')
    pdf.bullet('Таймаут 10с на API (не зависает при мёртвом бэкенде)')
    pdf.bullet('Обработка ошибок: NETWORK_ERROR, AUTH_INVALID_CREDENTIALS и др.')
    pdf.bullet('SVG-спиннер при загрузке')
    pdf.bullet('Кнопка диагностики бэкенда внизу страницы')
    pdf.bullet('Защита от Google Translate (translate="no", meta notranslate)')

    pdf.subsection('Задачи 2.3–2.6: НЕ НАЧАТЫ')
    pdf.status_badge('Dashboard — карточки, графики Recharts', done=False)
    pdf.status_badge('Страница клиентов — таблица, CRUD, фильтры', done=False)
    pdf.status_badge('Страница товаров — таблица, индикация остатков', done=False)
    pdf.status_badge('Страница заказов — создание, смена статусов', done=False)

    # === ИСПРАВЛЕНИЯ ===
    pdf.add_page()
    pdf.section('Исправления и багфиксы')

    pdf.subsection('Миграция: отсутствовал INSERT INTO tenants')
    pdf.body_text('Проблема: Миграция 001_initial.sql падала с ошибкой FK constraint — таблица tenants была пустой, но user_tenants ссылался на tenant_id=1.')
    pdf.body_text('Решение: Добавлен INSERT INTO tenants с данными MezoClub. Заменён placeholder bcrypt-хеш на реальный для пароля MezoClub2026!')

    pdf.subsection('Google Translate ломает React DOM')
    pdf.body_text('Проблема: Google Translate в Chrome модифицирует DOM-узлы напрямую, что конфликтует с виртуальным DOM React. Кнопка "Войти" отображалась как "(" при смене состояния loading.')
    pdf.body_text('Решение: Добавлены translate="no" и <meta name="google" content="notranslate"> для предотвращения автоперевода.')

    pdf.subsection('Зависание при недоступном бэкенде')
    pdf.body_text('Проблема: При нажатии "Войти" без запущенного бэкенда запрос висел бесконечно, кнопка оставалась в состоянии loading.')
    pdf.body_text('Решение: Добавлен таймаут 10с на axios. Обработка кодов ECONNABORTED и ERR_NETWORK с понятным сообщением "Бэкенд недоступен".')

    # === ИНФРАСТРУКТУРА ===
    pdf.section('Инфраструктура')
    pdf.body_text('Настройка окружения для запуска проекта:')
    pdf.bullet('Создан .env файл (DATABASE_URL, JWT_SECRET, PORT=3001)')
    pdf.bullet('Запущен PostgreSQL 16 (pg_ctlcluster 16 main start)')
    pdf.bullet('Создана БД mezoclub_crm, пользователь mezoclub')
    pdf.bullet('Выполнена миграция 001_initial.sql (9 таблиц, индексы, триггеры)')
    pdf.bullet('Выполнен seed: 3 пользователя, 20 клиентов, 15 товаров, 30 заказов')

    pdf.ln(4)
    pdf.subsection('Учётные записи для входа')
    pdf.table_row('Роль', 'Email / Пароль', bold=True)
    pdf.table_row('Владелец (owner)', 'owner@mezoclub.com / MezoClub2026!')
    pdf.table_row('Менеджер 1', 'ivan@mezoclub.com / Manager123!')
    pdf.table_row('Менеджер 2', 'olena@mezoclub.com / Manager123!')

    # === АРХИТЕКТУРА ===
    pdf.add_page()
    pdf.section('Архитектура проекта')

    pdf.subsection('Стек технологий')
    pdf.table_row('Компонент', 'Технология', bold=True)
    pdf.table_row('Backend', 'Node.js 20, Express 5, TypeScript 5.4')
    pdf.table_row('Database', 'PostgreSQL 16')
    pdf.table_row('Cache', 'Redis 7')
    pdf.table_row('Frontend', 'React 19, Tailwind CSS 4, Vite')
    pdf.table_row('State', 'Zustand (клиент), TanStack Query (сервер)')
    pdf.table_row('HTTP', 'Axios с JWT interceptors')
    pdf.table_row('i18n', 'react-i18next (русский, украинский)')
    pdf.table_row('Тесты', 'Jest + Supertest')
    pdf.table_row('Контейнеры', 'Docker + docker-compose')

    pdf.ln(4)
    pdf.subsection('Структура папок')
    pdf.code_block(
        'src/\n'
        '  modules/           — доменные модули\n'
        '    auth/            — авторизация (JWT, bcrypt)\n'
        '    clients/         — CRUD клиентов\n'
        '    products/        — CRUD товаров + остатки\n'
        '    orders/          — заказы + статусы\n'
        '    dashboard/       — сводные данные\n'
        '  shared/\n'
        '    database/        — pool.ts, base-repository.ts, seed.ts\n'
        '    types/           — общие интерфейсы\n'
        '    middleware/       — auth, error-handler, rate-limit\n'
        '    utils/           — validation, date helpers\n'
        '    config/          — swagger, tenant\n'
        '  client/            — React SPA\n'
        '    pages/           — LoginPage, DashboardPage\n'
        '    stores/          — Zustand stores\n'
        '    services/        — API client\n'
        '    locales/         — ru.json, uk.json\n'
        '  server/            — index.ts (точка входа)'
    )

    pdf.subsection('Мультитенантность')
    pdf.body_text('Архитектура готова к продаже CRM другим компаниям. Модель: shared database, shared schema — одна БД, разделение по tenant_id. Все бизнес-таблицы имеют поле tenant_id. Middleware автоматически подставляет tenant_id из JWT.')

    # === КАК ЗАПУСТИТЬ ===
    pdf.subsection('Как запустить проект')
    pdf.code_block(
        '# 1. Запустить PostgreSQL\n'
        'pg_ctlcluster 16 main start\n'
        '\n'
        '# 2. Бэкенд (терминал 1)\n'
        'npm run dev\n'
        '\n'
        '# 3. Фронтенд (терминал 2)\n'
        'npm run dev:client\n'
        '\n'
        '# 4. Открыть http://localhost:5173/login\n'
        '# Логин: owner@mezoclub.com\n'
        '# Пароль: MezoClub2026!'
    )

    # === КОММИТЫ ===
    pdf.section('История коммитов')
    pdf.table_row('Хеш', 'Описание', bold=True)
    pdf.table_row('f4a5faf', 'Sprint 1: backend MVP')
    pdf.table_row('e5b397f', 'feat: React фронтенд с Vite')
    pdf.table_row('a458719', 'fix: обработка ошибок + Google Translate')
    pdf.table_row('8de49c2', 'fix: INSERT INTO tenants + bcrypt хеш')
    pdf.table_row('33b0975', 'fix: защита LoginPage от Google Translate')
    pdf.table_row('b765f63', 'docs: CHANGELOG')

    # === СОХРАНЕНИЕ ===
    pdf.output('/home/user/mezoclub-crm/MezoClub_CRM_Report.pdf')
    print('PDF создан: /home/user/mezoclub-crm/MezoClub_CRM_Report.pdf')

if __name__ == '__main__':
    main()
