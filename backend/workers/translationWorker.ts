import { PrismaClient } from '@prisma/client';
import { translateText } from '../services/googleTranslation';

const prisma = new PrismaClient();
const LANGUAGE_CODES = {
  ms: 'ms',
  zh: 'zh',
  ta: 'ta',
  en: 'en',
} as const;

type LangKey = keyof typeof LANGUAGE_CODES; // 'ms' | 'zh' | 'ta' | 'en'

/**
 * Translates a set of fields for a given table/model
 * @param table - The database table name (e.g., 'job', 'company', 'industry')
 * @param id - The record ID
 * @param fields - Object with field names and their values to translate
 * @param targetLangs - Array of language codes to translate to
 */
export async function translateFieldSet(
  table: string,
  id: number,
  fields: { [key: string]: string | null },
  targetLangs: LangKey[]
) {
  const updates: Record<string, string> = {};

  for (const [fieldName, value] of Object.entries(fields)) {
    if (!value) continue;

    for (const lang of targetLangs) {
      const translatedField = `${fieldName}_${lang}`;
      try {
        const translatedText = await translateText(value, LANGUAGE_CODES[lang]);
        updates[translatedField] = translatedText;
      } catch (error) {
        console.error(
          `Translation failed for ${table}.${fieldName} to ${lang}:`,
          error
        );
        // Continue with other translations even if one fails
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    await (prisma as any)[table].update({
      where: { id },
      data: updates,
    });
  }
}

/**
 * Translates all jobs that don't have translations
 */
export async function translateJobs() {
  const jobs = await prisma.job.findMany({
    where: {
      OR: [
        { title_ms: null },
        { title_zh: null },
        { title_ta: null },
        { title_en: null },
        { suspensionReason_ms: null },
        { suspensionReason_zh: null },
        { suspensionReason_ta: null },
        { suspensionReason_en: null },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      requirements: true,
      benefits: true,
      rejectionReason: true,
      suspensionReason: true,
    },
  });

  console.log(`📝 Translating ${jobs.length} jobs...`);

  await Promise.allSettled(
    jobs.map((job) =>
      translateFieldSet(
        'job',
        job.id,
        {
          title: job.title,
          description: job.description,
          requirements: job.requirements,
          benefits: job.benefits,
          rejectionReason: job.rejectionReason,
          suspensionReason: job.suspensionReason || null,
        },
        ['ms', 'zh', 'ta', 'en']
      )
    )
  );

  console.log(`✅ Jobs translation complete`);
}

/**
 * Translates all reports missing description translations
 */
export async function translateReports() {
  const reports = await prisma.report.findMany({
    where: {
      OR: [
        { description_ms: null },
        { description_zh: null },
        { description_ta: null },
        { description_en: null },
      ],
    },
    select: { id: true, description: true },
  });

  console.log(`📝 Translating ${reports.length} reports...`);

  await Promise.allSettled(
    reports.map((report) =>
      translateFieldSet(
        'report',
        report.id,
        { description: report.description },
        ['ms', 'zh', 'ta', 'en']
      )
    )
  );

  console.log(`✅ Reports translation complete`);
}

/**
 * Translates all notifications missing message translations
 */
export async function translateNotifications() {
  const notifications = await prisma.notification.findMany({
    where: {
      OR: [
        { message_ms: null },
        { message_zh: null },
        { message_ta: null },
        { message_en: null },
      ],
    },
    select: { id: true, message: true },
  });

  console.log(`🔔 Translating ${notifications.length} notifications...`);

  await Promise.allSettled(
    notifications.map((n) =>
      translateFieldSet('notification', n.id, { message: n.message }, [
        'ms',
        'zh',
        'ta',
        'en',
      ])
    )
  );

  console.log(`✅ Notifications translation complete`);
}

/**
 * Translates all reviews missing comment translations
 */
export async function translateReviews() {
  const reviews = await prisma.review.findMany({
    where: {
      OR: [
        { comment_ms: null },
        { comment_zh: null },
        { comment_ta: null },
        { comment_en: null },
      ],
    },
    select: { id: true, comment: true },
  });

  console.log(`⭐ Translating ${reviews.length} reviews...`);

  await Promise.allSettled(
    reviews.map((r) =>
      translateFieldSet('review', r.id, { comment: r.comment || null }, [
        'ms',
        'zh',
        'ta',
        'en',
      ])
    )
  );

  console.log(`✅ Reviews translation complete`);
}

/**
 * Translates all appeals missing explanation translations
 */
export async function translateAppeals() {
  const appeals = await prisma.appeal.findMany({
    where: {
      OR: [
        { explanation_ms: null },
        { explanation_zh: null },
        { explanation_ta: null },
        { reviewNotes_ms: null },
        { reviewNotes_zh: null },
        { reviewNotes_ta: null },
        { explanation_en: null },
        { reviewNotes_en: null },
      ],
    },
    select: { id: true, explanation: true, reviewNotes: true },
  });

  console.log(`📣 Translating ${appeals.length} appeals...`);

  await Promise.allSettled(
    appeals.map((a) =>
      translateFieldSet(
        'appeal',
        a.id,
        { explanation: a.explanation, reviewNotes: a.reviewNotes || null },
        ['ms', 'zh', 'ta', 'en']
      )
    )
  );

  console.log(`✅ Appeals translation complete`);
}

/**
 * Translates all job appeals missing explanation/reviewNotes translations
 */
export async function translateJobAppeals() {
  const jobAppeals = await prisma.jobAppeal.findMany({
    where: {
      OR: [
        { explanation_ms: null },
        { explanation_zh: null },
        { explanation_ta: null },
        { reviewNotes_ms: null },
        { reviewNotes_zh: null },
        { reviewNotes_ta: null },
        { explanation_en: null },
        { reviewNotes_en: null },
      ],
    },
    select: { id: true, explanation: true, reviewNotes: true },
  });

  console.log(`📣 Translating ${jobAppeals.length} job appeals...`);

  await Promise.allSettled(
    jobAppeals.map((ja) =>
      translateFieldSet(
        'jobAppeal',
        ja.id,
        { explanation: ja.explanation, reviewNotes: ja.reviewNotes || null },
        ['ms', 'zh', 'ta', 'en']
      )
    )
  );

  console.log(`✅ Job appeals translation complete`);
}

/**
 * Translates all admin actions missing reason translations
 */
export async function translateAdminActions() {
  const actions = await prisma.adminAction.findMany({
    where: {
      OR: [
        { reason_ms: null },
        { reason_zh: null },
        { reason_ta: null },
        { reason_en: null },
      ],
    },
    select: { id: true, reason: true },
  });

  console.log(`🛠️ Translating ${actions.length} admin actions...`);

  await Promise.allSettled(
    actions.map((act) =>
      translateFieldSet('adminAction', act.id, { reason: act.reason || null }, [
        'ms',
        'zh',
        'ta',
        'en',
      ])
    )
  );

  console.log(`✅ Admin actions translation complete`);
}

/**
 * Translates all company verifications missing reviewNotes translations
 */
export async function translateCompanyVerifications() {
  const cvs = await prisma.companyVerification.findMany({
    where: {
      OR: [
        { reviewNotes_ms: null },
        { reviewNotes_zh: null },
        { reviewNotes_ta: null },
        { reviewNotes_en: null },
      ],
    },
    select: { id: true, reviewNotes: true },
  });

  console.log(`📄 Translating ${cvs.length} company verifications...`);

  await Promise.allSettled(
    cvs.map((cv) =>
      translateFieldSet(
        'companyVerification',
        cv.id,
        { reviewNotes: cv.reviewNotes || null },
        ['ms', 'zh', 'ta', 'en']
      )
    )
  );

  console.log(`✅ Company verifications translation complete`);
}

/**
 * Translates all users missing suspensionReason translations
 */
export async function translateUsersSuspensions() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { suspensionReason_ms: null },
        { suspensionReason_zh: null },
        { suspensionReason_ta: null },
        { suspensionReason_en: null },
      ],
      AND: [{ suspensionReason: { not: null } }],
    },
    select: { id: true, suspensionReason: true },
  });

  console.log(`👤 Translating ${users.length} users' suspensions...`);

  await Promise.allSettled(
    users.map((u) =>
      translateFieldSet(
        'user',
        u.id,
        { suspensionReason: u.suspensionReason || null },
        ['ms', 'zh', 'ta', 'en']
      )
    )
  );

  console.log(`✅ Users suspension translation complete`);
}

/**
 * Translates all industries that don't have translations
 */
export async function translateIndustries() {
  const industries = await prisma.industry.findMany({
    where: {
      OR: [
        { name_ms: null },
        { name_zh: null },
        { name_ta: null },
        { name_en: null },
      ],
    },
    select: {
      id: true,
      name: true,
      description: true,
    },
  });

  console.log(`🏭 Translating ${industries.length} industries...`);

  await Promise.allSettled(
    industries.map((industry) =>
      translateFieldSet(
        'industry',
        industry.id,
        {
          name: industry.name,
          description: industry.description,
        },
        ['ms', 'zh', 'ta', 'en']
      )
    )
  );

  console.log(`✅ Industries translation complete`);
}

/**
 * Translates all companies that don't have translations
 */
export async function translateCompanies() {
  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { name_ms: null },
        { name_zh: null },
        { name_ta: null },
        { verificationRemark_ms: null },
        { verificationRemark_zh: null },
        { verificationRemark_ta: null },
        { name_en: null },
        { verificationRemark_en: null },
      ],
    },
    select: {
      id: true,
      name: true,
      description: true,
      verificationRemark: true,
    },
  });

  console.log(`🏢 Translating ${companies.length} companies...`);

  await Promise.allSettled(
    companies.map((company) =>
      translateFieldSet(
        'company',
        company.id,
        {
          name: company.name,
          description: company.description,
          verificationRemark: company.verificationRemark || null,
        },
        ['ms', 'zh', 'ta', 'en']
      )
    )
  );

  console.log(`✅ Companies translation complete`);
}

/**
 * Translates all skills that don't have translations
 */
export async function translateSkills() {
  const skills = await prisma.skill.findMany({
    where: {
      OR: [
        { name_ms: null },
        { name_zh: null },
        { name_ta: null },
        { name_en: null },
      ],
    },
    select: { id: true, name: true },
  });

  console.log(`🔧 Translating ${skills.length} skills...`);

  await Promise.allSettled(
    skills.map((skill) =>
      translateFieldSet('skill', skill.id, { name: skill.name }, [
        'ms',
        'zh',
        'ta',
        'en',
      ])
    )
  );

  console.log(`✅ Skills translation complete`);
}

/**
 * Translates all languages that don't have translations
 */
export async function translateLanguages() {
  const languages = await prisma.language.findMany({
    where: {
      OR: [
        { name_ms: null },
        { name_zh: null },
        { name_ta: null },
        { name_en: null },
      ],
    },
    select: { id: true, name: true },
  });

  console.log(`🗣️ Translating ${languages.length} languages...`);

  await Promise.allSettled(
    languages.map((lang) =>
      translateFieldSet('language', lang.id, { name: lang.name }, [
        'ms',
        'zh',
        'ta',
        'en',
      ])
    )
  );

  console.log(`✅ Languages translation complete`);
}

/**
 * Main function to run all translations (for batch processing)
 */
async function main() {
  console.log('🌍 Starting translation process...');

  await translateJobs();
  await translateIndustries();
  await translateCompanies();
  await translateSkills();
  await translateLanguages();
  await translateReports();
  await translateNotifications();
  await translateReviews();
  await translateAppeals();
  await translateJobAppeals();
  await translateAdminActions();
  // New batch functions for recently added fields
  await translateCompanyVerifications();
  await translateUsersSuspensions();

  console.log('✅ Translation process complete!');
}

// Only run main if this file is executed directly
if (require.main === module) {
  main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
}
