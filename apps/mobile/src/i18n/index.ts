import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { detectInitialLanguage } from './language-detection';
import { resources } from './resources';

export { resources } from './resources';

void i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  defaultNS: 'common',
  fallbackLng: 'pt',
  interpolation: {
    escapeValue: false,
  },
  lng: detectInitialLanguage(),
  ns: [
    'common',
    'auth',
    'tours',
    'bookings',
    'guide',
    'map',
    'notifications',
    'payments',
    'errors',
    'experience',
  ],
  resources,
});

export default i18n;
