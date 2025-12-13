export type SupportedLang = 'en' | 'ms' | 'zh' | 'ta';

const JOB_TYPE_LABELS: Record<string, Record<SupportedLang, string>> = {
  FULL_TIME: {
    en: 'Full-time',
    ms: 'Sepenuh masa',
    zh: '全职',
    ta: 'முழு நேரம்',
  },
  PART_TIME: {
    en: 'Part-time',
    ms: 'Separuh masa',
    zh: '兼职',
    ta: 'பகுதி நேரம்',
  },
  CONTRACT: { en: 'Contract', ms: 'Kontrak', zh: '合同', ta: 'ஒப்பந்தம்' },
  TEMPORARY: { en: 'Temporary', ms: 'Sementara', zh: '临时', ta: 'தற்காலிக' },
  FREELANCE: {
    en: 'Freelance',
    ms: 'Pekerja bebas',
    zh: '自由职业',
    ta: 'ஃப்ரீலான்ஸ்',
  },
};

const WORKING_HOURS_LABELS: Record<string, Record<SupportedLang, string>> = {
  DAY_SHIFT: { en: 'Day shift', ms: 'Syif siang', zh: '日班', ta: 'பகல் வேளை' },
  NIGHT_SHIFT: {
    en: 'Night shift',
    ms: 'Syif malam',
    zh: '夜班',
    ta: 'இரவு வேளை',
  },
  ROTATING_SHIFT: {
    en: 'Rotating shift',
    ms: 'Syif bergilir',
    zh: '轮班',
    ta: 'மாறி மாறி வேளை',
  },
  FLEXIBLE: {
    en: 'Flexible',
    ms: 'Fleksibel',
    zh: '弹性时间',
    ta: 'நெகிழ்வான',
  },
  WEEKEND_ONLY: {
    en: 'Weekend only',
    ms: 'Hujung minggu sahaja',
    zh: '仅周末',
    ta: 'வார இறுதி மட்டும்',
  },
};

const EXPERIENCE_LEVEL_LABELS: Record<string, Record<SupportedLang, string>> = {
  ENTRY_LEVEL: {
    en: 'Entry level',
    ms: 'Peringkat permulaan',
    zh: '入门级',
    ta: 'தொடக்க நிலை',
  },
  JUNIOR: { en: 'Junior', ms: 'Junior', zh: '初级', ta: 'இளநிலை' },
  MID_LEVEL: { en: 'Mid-level', ms: 'Pertengahan', zh: '中级', ta: 'இடைநிலை' },
  SENIOR: { en: 'Senior', ms: 'Senior', zh: '高级', ta: 'மூத்த' },
  EXPERT: { en: 'Expert', ms: 'Pakar', zh: '专家', ta: 'நிபுணர்' },
};

const USER_ROLE_LABELS: Record<string, Record<SupportedLang, string>> = {
  JOB_SEEKER: {
    en: 'Job seeker',
    ms: 'Pencari kerja',
    zh: '求职者',
    ta: 'வேலை தேடுபவர்',
  },
  EMPLOYER: { en: 'Employer', ms: 'Majikan', zh: '雇主', ta: 'நியாமகர்' },
  ADMIN: { en: 'Admin', ms: 'Pentadbir', zh: '管理员', ta: 'நிர்வாகி' },
};

// ✅ UserStatus translations
const USER_STATUS_LABELS: Record<string, Record<SupportedLang, string>> = {
  ACTIVE: { en: 'Active', ms: 'Aktif', zh: '活跃', ta: 'செயலில்' },
  SUSPENDED: {
    en: 'Suspended',
    ms: 'Digantung',
    zh: '已停用',
    ta: 'இடைநிறுத்தப்பட்டது',
  },
  DELETED: { en: 'Deleted', ms: 'Dipadam', zh: '已删除', ta: 'அழிக்கப்பட்டது' },
};

// ✅ CompanySize translations
const COMPANY_SIZE_LABELS: Record<string, Record<SupportedLang, string>> = {
  STARTUP: {
    en: 'Startup',
    ms: 'Permulaan',
    zh: '创业公司',
    ta: 'தொடக்க நிறுவனம்',
  },
  SMALL: { en: 'Small', ms: 'Kecil', zh: '小型企业', ta: 'சிறிய' },
  MEDIUM: { en: 'Medium', ms: 'Sederhana', zh: '中型企业', ta: 'நடுத்தர' },
  LARGE: { en: 'Large', ms: 'Besar', zh: '大型企业', ta: 'பெரிய' },
  ENTERPRISE: {
    en: 'Enterprise',
    ms: 'Perusahaan',
    zh: '企业集团',
    ta: 'பெருநிறுவனம்',
  },
};

// ✅ SalaryType translations
const SALARY_TYPE_LABELS: Record<string, Record<SupportedLang, string>> = {
  HOURLY: {
    en: 'Hourly',
    ms: 'Sejam',
    zh: '时薪',
    ta: 'மணிக்கு',
  },
  DAILY: {
    en: 'Daily',
    ms: 'Sehari',
    zh: '日薪',
    ta: 'தினசரி',
  },
  WEEKLY: {
    en: 'Weekly',
    ms: 'Seminggu',
    zh: '周薪',
    ta: 'வாராந்திர',
  },
  MONTHLY: {
    en: 'Monthly',
    ms: 'Sebulan',
    zh: '月薪',
    ta: 'மாதாந்திர',
  },
  YEARLY: {
    en: 'Yearly',
    ms: 'Setahun',
    zh: '年薪',
    ta: 'ஆண்டாந்திர',
  },
  PER_PROJECT: {
    en: 'Per project',
    ms: 'Setiap projek',
    zh: '按项目计酬',
    ta: 'திட்டத்திற்கு',
  },
};

// Company Verification Status translations
const COMPANY_VERIFICATION_STATUS_LABELS: Record<
  string,
  Record<SupportedLang, string>
> = {
  APPROVED: {
    en: 'Approved',
    ms: 'Diluluskan',
    zh: '已批准',
    ta: 'அங்கீகரிக்கப்பட்டது',
  },
  PENDING: {
    en: 'Pending',
    ms: 'Tertangguh',
    zh: '待处理',
    ta: 'நிலுவையில்',
  },
  REJECTED: {
    en: 'Rejected',
    ms: 'Ditolak',
    zh: '已拒绝',
    ta: 'நிராகரிக்கப்பட்டது',
  },
  DISABLED: {
    en: 'Disabled',
    ms: 'Dilumpuhkan',
    zh: '已禁用',
    ta: 'செயல்திறன் இழந்தது',
  },
};

// Trust Score Level translations
const TRUST_SCORE_LEVEL_LABELS: Record<
  string,
  Record<SupportedLang, string>
> = {
  EXCELLENT: {
    en: 'Excellent',
    ms: 'Cemerlang',
    zh: '优秀',
    ta: 'மிகச் சிறந்தது',
  },
  GOOD: {
    en: 'Good',
    ms: 'Baik',
    zh: '良好',
    ta: 'நன்று',
  },
  FAIR: {
    en: 'Fair',
    ms: 'Sederhana',
    zh: '一般',
    ta: 'சராசரி',
  },
  POOR: {
    en: 'Poor',
    ms: 'Lemah',
    zh: '较差',
    ta: 'மோசமானது',
  },
};

// ✅ Job Report Status translations
const JOB_REPORT_STATUS_LABELS: Record<
  string,
  Record<SupportedLang, string>
> = {
  PENDING: { en: 'Pending', ms: 'Tertangguh', zh: '待处理', ta: 'நிலுவையில்' },
  UNDER_REVIEW: {
    en: 'Under review',
    ms: 'Dalam semakan',
    zh: '审核中',
    ta: 'மதிப்பாய்வில்',
  },
  RESOLVED: {
    en: 'Resolved',
    ms: 'Selesai',
    zh: '已解决',
    ta: 'தீர்க்கப்பட்டது',
  },
  DISMISSED: {
    en: 'Dismissed',
    ms: 'Ditolak',
    zh: '已驳回',
    ta: 'நிராகரிக்கப்பட்டது',
  },
  PENDING_EMPLOYER_RESPONSE: {
    en: 'Pending employer response',
    ms: 'Menunggu respons majikan',
    zh: '等待雇主回复',
    ta: 'நியாமகர் பதில் நிலுவையில்',
  },
};

export function labelEnum(
  kind:
    | 'JobType'
    | 'WorkingHours'
    | 'ExperienceLevel'
    | 'UserRole'
    | 'UserStatus'
    | 'CompanySize'
    | 'SalaryType'
    | 'CompanyVerificationStatus'
    | 'TrustScoreLevel'
    | 'JobReportStatus'
    | 'Gender',
  value: string | null | undefined,
  lang: SupportedLang = 'en'
): string | null {
  if (!value) return null;
  switch (kind) {
    case 'JobType':
      return JOB_TYPE_LABELS[value]?.[lang] || value;
    case 'WorkingHours':
      return WORKING_HOURS_LABELS[value]?.[lang] || value;
    case 'ExperienceLevel':
      return EXPERIENCE_LEVEL_LABELS[value]?.[lang] || value;
    case 'UserRole':
      return USER_ROLE_LABELS[value]?.[lang] || value;
    case 'UserStatus':
      return USER_STATUS_LABELS[value]?.[lang] || value;
    case 'CompanySize':
      return COMPANY_SIZE_LABELS[value]?.[lang] || value;
    case 'SalaryType':
      return SALARY_TYPE_LABELS[value]?.[lang] || value;
    case 'CompanyVerificationStatus':
      return COMPANY_VERIFICATION_STATUS_LABELS[value]?.[lang] || value;
    case 'TrustScoreLevel':
      return TRUST_SCORE_LEVEL_LABELS[value]?.[lang] || value;
    // Custom labels
    case 'JobReportStatus':
      return JOB_REPORT_STATUS_LABELS[value]?.[lang] || value;
    case 'Gender':
      return GENDER_LABELS[value]?.[lang] || value;
    default:
      return value;
  }
}

// Add gender labels
const GENDER_LABELS: Record<string, Record<SupportedLang, string>> = {
  MALE: { en: 'Male', ms: 'Lelaki', zh: '男', ta: 'ஆண்' },
  FEMALE: { en: 'Female', ms: 'Perempuan', zh: '女', ta: 'பெண்' },
  OTHER: { en: 'Other', ms: 'Lain-lain', zh: '其他', ta: 'மற்றவை' },
};
