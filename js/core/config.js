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
  maxPortfolioImageKB: 500,
  maxBackups: 7,
  maxActivityLog: 500,
};

/* ============================================================
   المقاسات القياسية الافتراضية
   (يمكن للمستخدم تعديلها من الإعدادات)
   ============================================================ */
export const DEFAULT_MEASUREMENT_FIELDS = [
  { id: 'shoulder', label: 'الكتف', enabled: true },
  { id: 'chest', label: 'الصدر', enabled: true },
  { id: 'waist', label: 'الوسط', enabled: true },
  { id: 'length', label: 'الطول', enabled: true },
  { id: 'sleeve', label: 'طول الكم', enabled: true },
  { id: 'neck', label: 'الرقبة', enabled: true },
  { id: 'bottom', label: 'الوسع (أسفل)', enabled: true },
  { id: 'hip', label: 'الأرداف', enabled: true }
];

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
  highContrast: false,
  compactMode: false,
  clientMode: false,
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
  referralRewardPercent: 5,
  trashRetentionDays: 7,
  dailyOrderLimit: 700,
  dailyOrderCount: 5,
  reminderDaysBefore: 1,
  // ===== جديد: المقاسات القابلة للتخصيص =====
  customMeasurementFields: DEFAULT_MEASUREMENT_FIELDS,
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
  commitments: [],
  commitmentPayments: [],
  houseExpenses: [],
  personalLoans: [],
  loanPayments: [],
  savingsGoals: [],
  
  // الميزات المتقدمة
  referrals: [],
  referralRewards: [],
  portfolio: [],
  
  // ===== جديد: أنواع الجلابيات مع الأسعار =====
  garmentTypes: [],
  
  // متفرقات
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
   تصنيفات الالتزامات
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

/* ============================================================
   تصنيفات معرض الأعمال
   ============================================================ */
export const PORTFOLIO_CATEGORIES = [
  { id: 'men', label: 'جلابيات رجالي', icon: '👔' },
  { id: 'women', label: 'جلابيات نسائي', icon: '👗' },
  { id: 'kids', label: 'جلابيات أطفال', icon: '🧒' },
  { id: 'embroidery', label: 'تطريز مميز', icon: '🪡' },
  { id: 'summer', label: 'صيفي', icon: '☀️' },
  { id: 'winter', label: 'شتوي', icon: '❄️' },
  { id: 'wedding', label: 'أفراح ومناسبات', icon: '💍' },
  { id: 'other', label: 'أخرى', icon: '📷' }
];

/* ============================================================
   أنواع الأنشطة (لسجل النشاط)
   ============================================================ */
export const ACTIVITY_TYPES = {
  CUSTOMER_ADDED: { id: 'customer:added', label: 'إضافة عميل', icon: '👤', color: '#2E7D32' },
  CUSTOMER_UPDATED: { id: 'customer:updated', label: 'تعديل عميل', icon: '✏️', color: '#F57C00' },
  CUSTOMER_DELETED: { id: 'customer:deleted', label: 'حذف عميل', icon: '🗑️', color: '#C62828' },
  ORDER_ADDED: { id: 'order:added', label: 'إضافة طلب', icon: '📋', color: '#2E7D32' },
  ORDER_UPDATED: { id: 'order:updated', label: 'تعديل طلب', icon: '✏️', color: '#F57C00' },
  ORDER_DELETED: { id: 'order:deleted', label: 'حذف طلب', icon: '🗑️', color: '#C62828' },
  PAYMENT_ADDED: { id: 'payment:added', label: 'تسجيل دفعة', icon: '💰', color: '#2E7D32' },
  PAYMENT_DELETED: { id: 'payment:deleted', label: 'حذف دفعة', icon: '🗑️', color: '#C62828' },
  EXPENSE_ADDED: { id: 'expense:added', label: 'إضافة مصروف', icon: '💸', color: '#F57C00' },
  EXPENSE_DELETED: { id: 'expense:deleted', label: 'حذف مصروف', icon: '🗑️', color: '#C62828' },
  INVENTORY_ADDED: { id: 'inventory:added', label: 'إضافة للمخزون', icon: '📦', color: '#2E7D32' },
  INVENTORY_UPDATED: { id: 'inventory:updated', label: 'تعديل مخزون', icon: '✏️', color: '#F57C00' },
  INVENTORY_DELETED: { id: 'inventory:deleted', label: 'حذف من المخزون', icon: '🗑️', color: '#C62828' },
  WORKER_ADDED: { id: 'worker:added', label: 'إضافة عامل', icon: '👷', color: '#2E7D32' },
  WORKER_DELETED: { id: 'worker:deleted', label: 'حذف عامل', icon: '🗑️', color: '#C62828' },
  COMMITMENT_ADDED: { id: 'commitment:added', label: 'إضافة التزام', icon: '💳', color: '#2E7D32' },
  COMMITMENT_DELETED: { id: 'commitment:deleted', label: 'حذف التزام', icon: '🗑️', color: '#C62828' },
  LOAN_ADDED: { id: 'loan:added', label: 'إضافة قرض', icon: '💵', color: '#2E7D32' },
  LOAN_DELETED: { id: 'loan:deleted', label: 'حذف قرض', icon: '🗑️', color: '#C62828' },
  HOUSE_EXPENSE_ADDED: { id: 'houseExpense:added', label: 'إضافة مصروف بيت', icon: '🏠', color: '#F57C00' },
  HOUSE_EXPENSE_DELETED: { id: 'houseExpense:deleted', label: 'حذف مصروف بيت', icon: '🗑️', color: '#C62828' },
  REFERRAL_ADDED: { id: 'referral:added', label: 'إضافة إحالة', icon: '🤝', color: '#2E7D32' },
  PORTFOLIO_ADDED: { id: 'portfolio:added', label: 'إضافة صورة للمعرض', icon: '📸', color: '#2E7D32' },
  PORTFOLIO_DELETED: { id: 'portfolio:deleted', label: 'حذف صورة من المعرض', icon: '🗑️', color: '#C62828' },
  GARMENT_TYPE_ADDED: { id: 'garmentType:added', label: 'إضافة نوع جلابية', icon: '👔', color: '#2E7D32' },
  GARMENT_TYPE_DELETED: { id: 'garmentType:deleted', label: 'حذف نوع جلابية', icon: '🗑️', color: '#C62828' },
  BACKUP_EXPORTED: { id: 'backup:exported', label: 'تصدير نسخة احتياطية', icon: '📤', color: '#1565C0' },
  BACKUP_IMPORTED: { id: 'backup:imported', label: 'استيراد نسخة احتياطية', icon: '📥', color: '#1565C0' },
  DATA_RESET: { id: 'data:reset', label: 'حذف جميع البيانات', icon: '⚠️', color: '#C62828' },
  PIN_CHANGED: { id: 'pin:changed', label: 'تغيير الرقم السري', icon: '🔑', color: '#1565C0' },
  THEME_CHANGED: { id: 'theme:changed', label: 'تغيير المظهر', icon: '🎨', color: '#F57C00' },
  TRASH_RESTORED: { id: 'trash:restored', label: 'استرجاع من السلة', icon: '♻️', color: '#2E7D32' },
  TRASH_DELETED: { id: 'trash:deleted', label: 'حذف نهائي من السلة', icon: '🗑️', color: '#C62828' }
};

/* ============================================================
   أنواع العناصر (لسلة المحذوفات)
   ============================================================ */
export const TRASH_ITEM_TYPES = {
  customer: { label: 'عميل', icon: '👤', color: '#2E7D32' },
  order: { label: 'طلب', icon: '📋', color: '#1565C0' },
  payment: { label: 'دفعة', icon: '💰', color: '#F57C00' },
  expense: { label: 'مصروف ورشة', icon: '💸', color: '#C62828' },
  inventory: { label: 'عنصر مخزون', icon: '📦', color: '#6A1B9A' },
  worker: { label: 'عامل', icon: '👷', color: '#0277BD' },
  workerPayment: { label: 'دفعة عامل', icon: '💵', color: '#EF6C00' },
  commitment: { label: 'التزام', icon: '💳', color: '#2E7D32' },
  commitmentPayment: { label: 'دفعة التزام', icon: '💵', color: '#EF6C00' },
  houseExpense: { label: 'مصروف بيت', icon: '🏠', color: '#C62828' },
  personalLoan: { label: 'قرض', icon: '💵', color: '#6A1B9A' },
  loanPayment: { label: 'دفعة قرض', icon: '💵', color: '#EF6C00' },
  savingsGoal: { label: 'هدف ادخار', icon: '🎯', color: '#2E7D32' },
  referral: { label: 'إحالة', icon: '🤝', color: '#0277BD' },
  portfolio: { label: 'صورة معرض', icon: '📸', color: '#6A1B9A' },
  garmentType: { label: 'نوع جلابية', icon: '👔', color: '#C62828' }
};
