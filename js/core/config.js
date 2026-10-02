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
  // البيانات الأساسية
  customers: [],
  orders: [],
  payments: [],
  expenses: [],
  
  // المالية الشخصية
  commitments: [],
  houseExpenses: [],
  personalLoans: [],
  
  // المخزون والعمال
  inventory: [],
  workers: [],
  workerPayments: [],
  
  // متفرقات
  garmentTypes: [],
  holidays: [],
  occasions: [],
  activityLog: [],
  trash: [],
  
  // الأمان
  password: '0000',
  managerPassword: null,
  receptionPassword: null,
  financePassword: null,
  
  // معلومات الإصدار
  updatedAt: 0,
  schemaVersion: 2,
};

/* ============================================================
   تصنيفات المخزون
   ============================================================ */
export const INVENTORY_CATEGORIES = [
  { id: 'fabric', label: 'أقمشة', icon: '🧵' },
  { id: 'thread', label: 'خيوط', icon: '🪡' },
  { id: 'buttons', label: 'أزرار', icon: '🔘' },
  { id: 'zippers', label: 'سحابات', icon: '🤐' },
  { id: 'decorations', label: 'زخارف وإكسسوارات', icon: '✨' },
  { id: 'tools', label: 'أدوات ومعدات', icon: '🔧' },
  { id: 'other', label: 'أخرى', icon: '📦' }
];

/* ============================================================
   أنواع أجور العمال
   ============================================================ */
export const WORKER_SALARY_TYPES = [
  { id: 'fixed', label: 'راتب ثابت شهري', icon: '💼' },
  { id: 'per_piece', label: 'بالقطعة', icon: '✂️' },
  { id: 'daily', label: 'أجر يومي', icon: '📅' },
  { id: 'hourly', label: 'أجر بالساعة', icon: '⏰' }
];

/* ============================================================
   تخصصات العمال
   ============================================================ */
export const WORKER_SPECIALTIES = [
  { id: 'cutting', label: 'قص', icon: '✂️' },
  { id: 'sewing', label: 'خياطة', icon: '🧵' },
  { id: 'embroidery', label: 'تطريز', icon: '🪡' },
  { id: 'ironing', label: 'كي', icon: '🔥' },
  { id: 'finishing', label: 'تشطيب', icon: '✨' },
  { id: 'packaging', label: 'تغليف', icon: '📦' }
];
