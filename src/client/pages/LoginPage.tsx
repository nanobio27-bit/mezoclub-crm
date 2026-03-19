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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Логотип и название */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[var(--color-accent-primary)]">
            {t('common.appName')}
          </h1>
          <p className="mt-1 text-sm text-gray-400 italic">
            {t('common.motto')} — {t('common.mottoFull')}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 outline-none transition focus:border-[var(--color-accent-primary)] focus:ring-1 focus:ring-[var(--color-accent-primary)]"
                placeholder="••••••••"
              />
            </div>

            {/* Ошибка авторизации */}
            {error && (
              <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-4 py-2.5 text-sm text-[var(--color-danger)]">
                {t(`errors.${error}`, { defaultValue: t('common.errorOccurred') })}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-[var(--color-accent-primary)] px-4 py-2.5 font-medium text-white transition hover:bg-[var(--color-accent-primary)]/80 disabled:opacity-50"
            >
              {isLoading ? t('common.loading') : t('auth.login')}
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
      </div>
    </div>
  );
}
