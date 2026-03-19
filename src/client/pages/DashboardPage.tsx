// Страница дашборда (заглушка)
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/auth-store';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        {/* Хедер */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('dashboard.title')}</h1>
            <p className="text-gray-400">
              {t('dashboard.greeting', { name: user?.name || 'User' })}
            </p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 transition hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
          >
            {t('auth.logout')}
          </button>
        </div>

        {/* Карточки метрик */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: t('dashboard.todayRevenue'), value: '0 ₴', color: 'var(--color-success)' },
            { label: t('dashboard.activeOrders'), value: '0', color: 'var(--color-accent-primary)' },
            { label: t('dashboard.activeClients'), value: '0', color: 'var(--color-accent-secondary)' },
            { label: t('dashboard.lowStock'), value: '0', color: 'var(--color-warning)' },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md"
            >
              <p className="text-sm text-gray-400">{card.label}</p>
              <p className="mt-1 text-2xl font-bold" style={{ color: card.color }}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
