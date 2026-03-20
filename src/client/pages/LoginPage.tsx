// Страница входа в CRM
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await login(email, password);
    if (useAuthStore.getState().isAuthenticated) {
      navigate('/');
    }
  };

  const toggleLanguage = () => {
    const next = i18n.language === 'ru' ? 'uk' : 'ru';
    i18n.changeLanguage(next);
    localStorage.setItem('language', next);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" translate="no">
      <div className="w-full max-w-md">
        {/* Логотип и название */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[var(--color-accent-primary)]">
            MezoClub CRM
          </h1>
          <p className="mt-1 text-sm text-gray-400 italic">
            Time to Live — Время жить
          </p>
        </div>

        {/* Форма входа */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
          <h2 className="mb-6 text-xl font-semibold text-white">
            {t('auth.loginTitle')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm text-gray-300">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 outline-none transition focus:border-[var(--color-accent-primary)] focus:ring-1 focus:ring-[var(--color-accent-primary)]"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm text-gray-300">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 outline-none transition focus:border-[var(--color-accent-primary)] focus:ring-1 focus:ring-[var(--color-accent-primary)]"
                placeholder="••••••••"
              />
            </div>

            {/* Ошибка авторизации */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                {t(`errors.${error}`, { defaultValue: t('common.errorOccurred') })}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-[var(--color-accent-primary)] px-4 py-2.5 font-medium text-white transition hover:bg-[var(--color-accent-primary)]/80 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('common.loading')}
                </span>
              ) : (
                t('auth.login')
              )}
            </button>
          </form>
        </div>

        {/* Переключатель языка */}
        <div className="mt-4 text-center">
          <button
            onClick={toggleLanguage}
            className="text-sm text-gray-500 transition hover:text-gray-300"
          >
            {i18n.language === 'ru' ? 'Українська' : 'Русский'}
          </button>
        </div>

        {/* Диагностика */}
        <div className="mt-6 text-center text-xs text-gray-600">
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetch('/api/health');
                const data = await res.json();
                alert('Backend OK: ' + JSON.stringify(data));
              } catch (err) {
                alert('Backend НЕДОСТУПЕН! Запустите: npm run dev\n\n' + String(err));
              }
            }}
            className="underline hover:text-gray-400"
          >
            {t('common.appName')} — проверить бэкенд
          </button>
        </div>
      </div>
    </div>
  );
}
