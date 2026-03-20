-- migrations/001_initial.sql
-- MezoClub CRM: MVP Schema
-- Дата: 2026-03-10
-- 
-- Что здесь: Все таблицы для MVP (авторизация, клиенты, товары, заказы)
-- Как применить: psql -U mezoclub -d mezoclub_crm -f migrations/001_initial.sql

BEGIN;

-- ============================================
-- 0. ТЕНАНТЫ (закладка: продажа CRM другим компаниям)
-- ============================================
-- Сейчас один тенант — MezoClub. Каждый тенант видит ТОЛЬКО свои данные.
-- Когда решим продавать — добавляем запись сюда, и новая компания работает.
CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,              -- MezoClub
    slug VARCHAR(50) NOT NULL UNIQUE,        -- mezoclub (для URL и номеров заказов)
    domain VARCHAR(255),                     -- Кастомный домен: crm.mezoclub.com
    logo_url TEXT,
    settings JSONB DEFAULT '{}',             -- Настройки тенанта (валюта, формат дат...)
    plan VARCHAR(30) DEFAULT 'basic',        -- basic, pro, enterprise
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 1. ПОЛЬЗОВАТЕЛИ (кто работает в CRM)
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(200) NOT NULL,
    roles TEXT[] DEFAULT '{admin}',          -- Массив ролей: admin, manager, sales...
    account_type VARCHAR(20) DEFAULT 'internal', -- internal = сотрудник, external = клиент
    phone VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    preferred_language VARCHAR(5) DEFAULT 'ru', -- ru, uk, en
    last_login_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ DEFAULT NULL,     -- Soft delete (не удаляем, помечаем)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh tokens для безопасной авторизации
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    family_id UUID NOT NULL,                 -- Группа связанных токенов
    is_revoked BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    replaced_by INTEGER REFERENCES refresh_tokens(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id, is_revoked);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash) WHERE is_revoked = false;

-- Связь пользователя с тенантами (один юзер может работать в нескольких компаниях)
CREATE TABLE user_tenants (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    roles TEXT[] DEFAULT '{viewer}',         -- Роли могут отличаться в разных компаниях
    is_default BOOLEAN DEFAULT false,        -- Тенант по умолчанию при логине
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, tenant_id)
);

-- ============================================
-- 2. КЛИЕНТЫ (кому продаём)
-- ============================================
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),  -- МУЛЬТИТЕНАНТ
    name VARCHAR(200) NOT NULL,              -- Название клиники / ФИО косметолога
    email VARCHAR(255),
    phone VARCHAR(20),
    company VARCHAR(200),                    -- Название компании
    client_type VARCHAR(30) DEFAULT 'clinic', -- clinic, cosmetologist, distributor
    segment VARCHAR(50),                     -- VIP, standard, new
    status VARCHAR(30) DEFAULT 'new',        -- new, active, inactive, lost
    manager_id INTEGER REFERENCES users(id), -- Ответственный менеджер
    city VARCHAR(100),
    address TEXT,
    source VARCHAR(50),                      -- Откуда пришёл: amoCRM, referral, web...
    notes TEXT,
    total_orders INTEGER DEFAULT 0,          -- Денормализация для быстрого доступа
    total_revenue DECIMAL(12,2) DEFAULT 0,
    last_order_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_manager ON clients(tenant_id, manager_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_status ON clients(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_type ON clients(tenant_id, client_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_city ON clients(city) WHERE deleted_at IS NULL;

-- ============================================
-- 3. ТОВАРЫ (что продаём)
-- ============================================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),  -- МУЛЬТИТЕНАНТ
    name VARCHAR(200) NOT NULL,              -- AESSOA, GANA FILL...
    sku VARCHAR(50),                        -- Артикул (уникален внутри тенанта)
    brand VARCHAR(100),                      -- MezoClub, PLARECETA...
    category VARCHAR(50),                    -- filler, biorevitalizant, cosmetic...
    description TEXT,
    price DECIMAL(10,2) NOT NULL,            -- Цена продажи (грн)
    cost_price DECIMAL(10,2),               -- Себестоимость (грн)
    stock_quantity INTEGER DEFAULT 0,        -- Текущий остаток
    min_stock_level INTEGER DEFAULT 10,      -- Минимальный остаток (уведомление)
    unit VARCHAR(20) DEFAULT 'шт',           -- шт, упаковка, мл...
    is_active BOOLEAN DEFAULT true,
    image_url TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_products_sku ON products(tenant_id, sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_brand ON products(tenant_id, brand) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category ON products(tenant_id, category) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_low_stock ON products(stock_quantity) 
    WHERE stock_quantity <= 10 AND is_active = true AND deleted_at IS NULL;

-- ============================================
-- 4. ЗАКАЗЫ (что купили)
-- ============================================

-- Статусы заказа как жизненный цикл:
-- new → confirmed → in_production → ready → shipped → delivered → completed
-- На любом этапе может перейти в: cancelled, returned

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),  -- МУЛЬТИТЕНАНТ
    order_number VARCHAR(20) NOT NULL UNIQUE, -- MC-2026-00001
    client_id INTEGER NOT NULL REFERENCES clients(id),
    manager_id INTEGER REFERENCES users(id),  -- Кто обрабатывает
    status VARCHAR(30) DEFAULT 'new',
    payment_status VARCHAR(30) DEFAULT 'pending', -- pending, partial, paid, overdue
    
    -- Суммы
    subtotal DECIMAL(12,2) DEFAULT 0,        -- Сумма до скидки
    discount_amount DECIMAL(12,2) DEFAULT 0, -- Скидка
    total_amount DECIMAL(12,2) DEFAULT 0,    -- Итого к оплате
    paid_amount DECIMAL(12,2) DEFAULT 0,     -- Уже оплачено
    
    -- Доставка
    delivery_type VARCHAR(30),               -- nova_poshta, pickup, courier
    delivery_address TEXT,
    delivery_city VARCHAR(100),
    tracking_number VARCHAR(100),
    
    notes TEXT,
    confirmed_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,      -- Снимок названия на момент заказа
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,       -- Цена за единицу на момент заказа
    discount_percent DECIMAL(5,2) DEFAULT 0,
    total_price DECIMAL(12,2) NOT NULL,      -- quantity * unit_price * (1 - discount)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_client ON orders(tenant_id, client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_status ON orders(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_manager ON orders(tenant_id, manager_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_created ON orders(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_payment ON orders(payment_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- ============================================
-- 5. AUDIT LOG (кто что изменил)
-- ============================================
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    user_id INTEGER REFERENCES users(id),
    entity_type VARCHAR(50) NOT NULL,        -- 'client', 'order', 'product'
    entity_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL,             -- 'create', 'update', 'delete'
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);

-- ============================================
-- 6. АВТОГЕНЕРАЦИЯ НОМЕРА ЗАКАЗА
-- ============================================
CREATE SEQUENCE order_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    tenant_slug TEXT;
BEGIN
    -- Берём slug тенанта для префикса (MC для mezoclub)
    SELECT UPPER(LEFT(slug, 2)) INTO tenant_slug FROM tenants WHERE id = NEW.tenant_id;
    NEW.order_number := COALESCE(tenant_slug, 'XX') || '-' || 
        EXTRACT(YEAR FROM NOW())::TEXT || '-' || 
        LPAD(nextval('order_number_seq')::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL)
    EXECUTE FUNCTION generate_order_number();

-- ============================================
-- 7. АВТООБНОВЛЕНИЕ updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON tenants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 8. SEED: MezoClub тенант + владелец
-- ============================================

-- Создаём тенант MezoClub
INSERT INTO tenants (name, slug, is_active) VALUES
    ('MezoClub', 'mezoclub', true);

-- Пароль: MezoClub2026!
INSERT INTO users (email, password_hash, name, roles, preferred_language) VALUES
    ('owner@mezoclub.com', '$2b$12$LosU6WDrvSVsDzHbzmEYc.vM7nWSRtB/vfUVNY/54q8iQUEZYlOWK', 'Владимир Барсуков', '{owner,admin}', 'ru');

-- Привязка владельца к тенанту MezoClub
INSERT INTO user_tenants (user_id, tenant_id, roles, is_default) VALUES 
    (1, 1, '{owner,admin}', true);

COMMIT;
