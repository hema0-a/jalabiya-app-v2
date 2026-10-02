/* ============================================================
   config.js - الإعدادات الثابتة الشاملة (V2)
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
  
  // المخزون والعمال
  inventory: [],
  workers: [],
  workerPayments: [],
  
  // المالية الشخصية
  commitments: [],          // الالتزامات الشهرية (إيجار، أقساط، فواتير)
  commitmentPayments: [],   // دفعات الالتزامات
  houseExpenses: [],        // مصاريف البيت
  personalLoans: [],        // القروض والمديونيات
  loanPayments: [],         // دفعات القروض
  savingsGoals: [],         // أهداف الادخار
  
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

/* ============================================================
   تصنيفات مصروفات الورشة
   ============================================================ */
export const EXPENSE_CATEGORIES = [
  { id: 'materials', label: 'خامات وأقمشة', icon: '🧵' },
  { id: 'rent', label: 'إيجار', icon: '🏠' },
  { id: 'electricity', label: 'كهرباء ومياه', icon: '💡' },
  { id: 'workers', label: 'أجور عمال', icon: '👷' },
  { id: 'maintenance', label: 'صيانة', icon: '🔧' },
  { id: 'transport', label: 'مواصلات', icon: '🚗' },
  { id: 'supplies', label: 'أدوات ومستلزمات', icon: '📦' },
  { id: 'other', label: 'أخرى', icon: '📌' }
];

/* ============================================================
   تصنيفات الالتزامات الشخصية
   ============================================================ */
export const COMMITMENT_CATEGORIES = [
  { id: 'rent', label: 'إيجار', icon: '🏠' },
  { id: 'installment', label: 'قسط', icon: '💳' },
  { id: 'bill', label: 'فاتورة', icon: '🧾' },
  { id: 'saving', label: 'ادخار', icon: '🏦' },
  { id: 'insurance', label: 'تأمين', icon: '🛡️' },
  { id: 'school', label: 'تعليم', icon: '🎓' },
  { id: 'loan', label: 'سداد قرض', icon: '💵' },
  { id: 'other', label: 'أخرى', icon: '📌' }
];

/* ============================================================
   دورية الالتزامات
   ============================================================ */
export const COMMITMENT_FREQUENCIES = [
  { id: 'monthly', label: 'شهري', icon: '📅' },
  { id: 'quarterly', label: 'كل 3 شهور', icon: '📆' },
  { id: 'semi_annual', label: 'كل 6 شهور', icon: '🗓️' },
  { id: 'annual', label: 'سنوي', icon: '🎯' },
  { id: 'weekly', label: 'أسبوعي', icon: '📊' },
  { id: 'once', label: 'مرة واحدة', icon: '1️⃣' }
];

/* ============================================================
   تصنيفات مصاريف البيت
   ============================================================ */
export const HOUSE_EXPENSE_CATEGORIES = [
  { id: 'food', label: 'طعام وشراب', icon: '🍞' },
  { id: 'bills', label: 'فواتير', icon: '🧾' },
  { id: 'transport', label: 'مواصلات', icon: '🚗' },
  { id: 'health', label: 'صحة ودواء', icon: '💊' },
  { id: 'education', label: 'تعليم', icon: '📚' },
  { id: 'clothes', label: 'ملابس', icon: '👕' },
  { id: 'entertainment', label: 'ترفيه', icon: '🎬' },
  { id: 'home_maintenance', label: 'صيانة المنزل', icon: '🔧' },
  { id: 'gifts', label: 'هدايا ومناسبات', icon: '🎁' },
  { id: 'other', label: 'أخرى', icon: '📌' }
];

/* ============================================================
   أنواع القروض
   ============================================================ */
export const LOAN_TYPES = [
  { id: 'given', label: 'قرض قدّمته (ليّ)', icon: '📤' },
  { id: 'received', label: 'قرض استلمته (عليّ)', icon: '📥' }
];
