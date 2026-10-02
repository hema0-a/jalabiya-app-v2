/* ============================================================
   config.js - الإعدادات الثابتة (V2)
   ============================================================ */

export const APP_CONFIG = {
  name: 'ورشة تفصيل الجلابيب V2',
  version: '2.0.0',
  storageKey: 'jalabiya_v2_db',
  backupKey: 'jalabiya_v2_backup',
  settingsKey: 'jalabiya_v2_settings',
  sessionKey: 'jalabiya_v2_session',
  conflictBackupKey: 'jalabiya_v2_conflicts',
  language: 'ar',
  direction: 'rtl',
  
  maxPinAttempts: 5,
  pinLockSeconds: 30,
  idleLockMinutes: 3,
  
  saveDebounceMs: 300,
  autosaveBackupMs: 5 * 60 * 1000,
  
  maxCustomers: 10000,
  maxOrders: 50000,
  maxFileSizeKB: 900,
  maxBackups: 7,
};

export const DEFAULT_SETTINGS = {
  workshopName: 'ورشة تفصيل الجلابيب',
  ownerName: '',
  ownerPhone: '',
  workshopAddress: '',
  workshopLogo: null,
  theme: {
    primary: '#1F6D57',
    primaryDark: '#123C2F',
    accent: '#B8863B',
    bg: '#F6F1E6',
  },
  darkMode: false,
  fontFamily: 'default',
  fontSize: 1,
  dayOffWeekday: 0,
  workStartHour: 9,
  workEndHour: 18,
  dailyCapacity: 500,
  vipThreshold: 3,
  vipDiscountPercent: 0,
  debtThreshold: 2000,
  taxDefaultPercent: 0,
  urgentFeeDefaultPercent: 0,
  nextInvoiceNumber: 1001,
};

export const DEFAULT_DB = {
  customers: [],
  orders: [],
  payments: [],
  expenses: [],
  commitments: [],
  houseExpenses: [],
  personalLoans: [],
  garmentTypes: [],
  holidays: [],
  occasions: [],
  activityLog: [],
  trash: [],
  password: '0000',
  managerPassword: null,
  receptionPassword: null,
  financePassword: null,
  updatedAt: 0,
  schemaVersion: 2,
};
