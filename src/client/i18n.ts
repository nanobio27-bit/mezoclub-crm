// Настройка i18next для мультиязычности
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './locales/ru.json';
import uk from './locales/uk.json';

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    uk: { translation: uk },
  },
  lng: localStorage.getItem('language') || 'ru',
  fallbackLng: 'ru',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
