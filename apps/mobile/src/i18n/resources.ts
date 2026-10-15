import type { SupportedLanguageCode } from '@conexao-favela/shared';

import ptAuth from './locales/pt/auth.json';
import ptBookings from './locales/pt/bookings.json';
import ptCommon from './locales/pt/common.json';
import ptErrors from './locales/pt/errors.json';
import ptExperience from './locales/pt/experience.json';
import ptGuide from './locales/pt/guide.json';
import ptMap from './locales/pt/map.json';
import ptNotifications from './locales/pt/notifications.json';
import ptPayments from './locales/pt/payments.json';
import ptTours from './locales/pt/tours.json';
import enAuth from './locales/en/auth.json';
import enBookings from './locales/en/bookings.json';
import enCommon from './locales/en/common.json';
import enErrors from './locales/en/errors.json';
import enExperience from './locales/en/experience.json';
import enGuide from './locales/en/guide.json';
import enMap from './locales/en/map.json';
import enNotifications from './locales/en/notifications.json';
import enPayments from './locales/en/payments.json';
import enTours from './locales/en/tours.json';
import esAuth from './locales/es/auth.json';
import esBookings from './locales/es/bookings.json';
import esCommon from './locales/es/common.json';
import esErrors from './locales/es/errors.json';
import esExperience from './locales/es/experience.json';
import esGuide from './locales/es/guide.json';
import esMap from './locales/es/map.json';
import esNotifications from './locales/es/notifications.json';
import esPayments from './locales/es/payments.json';
import esTours from './locales/es/tours.json';
import frAuth from './locales/fr/auth.json';
import frBookings from './locales/fr/bookings.json';
import frCommon from './locales/fr/common.json';
import frErrors from './locales/fr/errors.json';
import frExperience from './locales/fr/experience.json';
import frGuide from './locales/fr/guide.json';
import frMap from './locales/fr/map.json';
import frNotifications from './locales/fr/notifications.json';
import frPayments from './locales/fr/payments.json';
import frTours from './locales/fr/tours.json';
import deAuth from './locales/de/auth.json';
import deBookings from './locales/de/bookings.json';
import deCommon from './locales/de/common.json';
import deErrors from './locales/de/errors.json';
import deExperience from './locales/de/experience.json';
import deGuide from './locales/de/guide.json';
import deMap from './locales/de/map.json';
import deNotifications from './locales/de/notifications.json';
import dePayments from './locales/de/payments.json';
import deTours from './locales/de/tours.json';
import itAuth from './locales/it/auth.json';
import itBookings from './locales/it/bookings.json';
import itCommon from './locales/it/common.json';
import itErrors from './locales/it/errors.json';
import itExperience from './locales/it/experience.json';
import itGuide from './locales/it/guide.json';
import itMap from './locales/it/map.json';
import itNotifications from './locales/it/notifications.json';
import itPayments from './locales/it/payments.json';
import itTours from './locales/it/tours.json';
import zhAuth from './locales/zh/auth.json';
import zhBookings from './locales/zh/bookings.json';
import zhCommon from './locales/zh/common.json';
import zhErrors from './locales/zh/errors.json';
import zhExperience from './locales/zh/experience.json';
import zhGuide from './locales/zh/guide.json';
import zhMap from './locales/zh/map.json';
import zhNotifications from './locales/zh/notifications.json';
import zhPayments from './locales/zh/payments.json';
import zhTours from './locales/zh/tours.json';
import jaAuth from './locales/ja/auth.json';
import jaBookings from './locales/ja/bookings.json';
import jaCommon from './locales/ja/common.json';
import jaErrors from './locales/ja/errors.json';
import jaExperience from './locales/ja/experience.json';
import jaGuide from './locales/ja/guide.json';
import jaMap from './locales/ja/map.json';
import jaNotifications from './locales/ja/notifications.json';
import jaPayments from './locales/ja/payments.json';
import jaTours from './locales/ja/tours.json';

export const resources = {
  pt: {
    auth: ptAuth,
    bookings: ptBookings,
    common: ptCommon,
    errors: ptErrors,
    experience: ptExperience,
    guide: ptGuide,
    map: ptMap,
    notifications: ptNotifications,
    payments: ptPayments,
    tours: ptTours,
  },
  en: {
    auth: enAuth,
    bookings: enBookings,
    common: enCommon,
    errors: enErrors,
    experience: enExperience,
    guide: enGuide,
    map: enMap,
    notifications: enNotifications,
    payments: enPayments,
    tours: enTours,
  },
  es: {
    auth: esAuth,
    bookings: esBookings,
    common: esCommon,
    errors: esErrors,
    experience: esExperience,
    guide: esGuide,
    map: esMap,
    notifications: esNotifications,
    payments: esPayments,
    tours: esTours,
  },
  fr: {
    auth: frAuth,
    bookings: frBookings,
    common: frCommon,
    errors: frErrors,
    experience: frExperience,
    guide: frGuide,
    map: frMap,
    notifications: frNotifications,
    payments: frPayments,
    tours: frTours,
  },
  de: {
    auth: deAuth,
    bookings: deBookings,
    common: deCommon,
    errors: deErrors,
    experience: deExperience,
    guide: deGuide,
    map: deMap,
    notifications: deNotifications,
    payments: dePayments,
    tours: deTours,
  },
  it: {
    auth: itAuth,
    bookings: itBookings,
    common: itCommon,
    errors: itErrors,
    experience: itExperience,
    guide: itGuide,
    map: itMap,
    notifications: itNotifications,
    payments: itPayments,
    tours: itTours,
  },
  zh: {
    auth: zhAuth,
    bookings: zhBookings,
    common: zhCommon,
    errors: zhErrors,
    experience: zhExperience,
    guide: zhGuide,
    map: zhMap,
    notifications: zhNotifications,
    payments: zhPayments,
    tours: zhTours,
  },
  ja: {
    auth: jaAuth,
    bookings: jaBookings,
    common: jaCommon,
    errors: jaErrors,
    experience: jaExperience,
    guide: jaGuide,
    map: jaMap,
    notifications: jaNotifications,
    payments: jaPayments,
    tours: jaTours,
  },
} satisfies Record<SupportedLanguageCode, unknown>;
