// src/shared/config/tenant.ts
// Конфигурация тенанта (компании) — всё что нужно для white-label
// 
// ЗАЧЕМ: Когда продаёшь CRM другой компании, она меняет этот файл
// и получает свою CRM с другим названием, логотипом, цветами.
// Код менять НЕ нужно.
//
// КАК РАБОТАЕТ:
// 1. Сейчас (MVP): один файл конфига для MezoClub
// 2. Потом (продажа): конфиг загружается из БД по домену/tenant_id
// 3. Масштаб (SaaS): каждый клиент имеет свой конфиг в таблице tenants

export interface TenantConfig {
  // === Компания ===
  companyName: string;          // Название компании
  companySlogan: string;        // Слоган
  companySloganTranslation: string;
  logoUrl: string;              // URL логотипа
  faviconUrl: string;           // Иконка вкладки браузера
  website: string;              // Сайт компании
  supportEmail: string;         // Email поддержки

  // === Локализация ===
  defaultLanguage: 'ru' | 'uk' | 'en';
  availableLanguages: ('ru' | 'uk' | 'en')[];
  currency: string;             // UAH, USD, EUR...
  currencySymbol: string;       // ₴, $, €
  timezone: string;             // Europe/Kyiv

  // === Дизайн (тёмная тема) ===
  theme: {
    background: string;         // Фон
    accentPrimary: string;      // Основной акцент
    accentSecondary: string;    // Вторичный акцент
    success: string;            // Цвет успеха
    danger: string;             // Цвет опасности
    warning: string;            // Цвет предупреждения
  };

  // === Бизнес-настройки ===
  business: {
    orderPrefix: string;        // Префикс номера заказа: MC, PH, BB...
    defaultPaymentTermDays: number; // Дней на оплату по умолчанию
    lowStockThreshold: number;  // Порог низкого остатка по умолчанию
    enabledModules: string[];   // Какие модули включены
  };

  // === Будущее (disabled для MVP) ===
  features: {
    aiAgents: boolean;          // AI-агенты
    ginCoin: boolean;           // Система лояльности
    goldenHour: boolean;        // Золотой час
    gMirror: boolean;           // G-Зеркало
    b2cShop: boolean;           // B2C магазин
    vipBadges: boolean;         // VIP-бейджи
  };
}

// ============================================
// КОНФИГ ДЛЯ MEZOCLUB (по умолчанию)
// ============================================
export const defaultTenantConfig: TenantConfig = {
  // Компания
  companyName: 'MezoClub',
  companySlogan: 'Time to Live',
  companySloganTranslation: 'Время жить',
  logoUrl: '/assets/logo-mezoclub.svg',
  faviconUrl: '/assets/favicon.ico',
  website: 'https://mezoclub.com.ua',
  supportEmail: 'support@mezoclub.com.ua',

  // Локализация
  defaultLanguage: 'ru',
  availableLanguages: ['ru', 'uk'],
  currency: 'UAH',
  currencySymbol: '₴',
  timezone: 'Europe/Kyiv',

  // Дизайн
  theme: {
    background: '#0B0E14',
    accentPrimary: '#8B5CF6',
    accentSecondary: '#06B6D4',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
  },

  // Бизнес
  business: {
    orderPrefix: 'MC',
    defaultPaymentTermDays: 14,
    lowStockThreshold: 10,
    enabledModules: ['auth', 'clients', 'products', 'orders', 'dashboard'],
  },

  // Будущие модули (всё выключено для MVP)
  features: {
    aiAgents: false,
    ginCoin: false,
    goldenHour: false,
    gMirror: false,
    b2cShop: false,
    vipBadges: false,
  },
};

// ============================================
// ПРИМЕР: КОНФИГ ДЛЯ ДРУГОЙ КОМПАНИИ
// ============================================
// Когда продаёшь CRM, покупатель получает свой конфиг:
//
// export const pharmaBeautyConfig: TenantConfig = {
//   companyName: 'PharmaBeauty',
//   companySlogan: 'Science of Beauty',
//   companySloganTranslation: 'Наука красоты',
//   logoUrl: '/assets/logo-pharmabeauty.svg',
//   ...
//   theme: {
//     background: '#0A1628',
//     accentPrimary: '#3B82F6',    // синий вместо фиолетового
//     accentSecondary: '#14B8A6',
//     ...
//   },
//   business: {
//     orderPrefix: 'PB',           // PB-2026-00001
//     ...
//   },
// };

/**
 * Получить текущий конфиг тенанта
 * Сейчас: возвращает дефолтный (MezoClub)
 * Потом: будет загружать из БД по домену
 */
export function getTenantConfig(): TenantConfig {
  // TODO Фаза 2: загружать из БД или .env
  return defaultTenantConfig;
}
