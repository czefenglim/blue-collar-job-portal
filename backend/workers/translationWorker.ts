// import { PrismaClient } from '@prisma/client';
// import { translateText } from '../services/googleTranslation';

// const prisma = new PrismaClient();
// const LANGUAGE_CODES = {
//   ms: 'ms',
//   zh: 'zh',
//   ta: 'ta',
// } as const;

// type LangKey = keyof typeof LANGUAGE_CODES; // 'ms' | 'zh' | 'ta'

// async function translateFieldSet(
//   table: string,
//   id: number,
//   fields: { [key: string]: string | null },
//   targetLangs: LangKey[]
// ) {
//   const updates: Record<string, string> = {};

//   for (const [fieldName, value] of Object.entries(fields)) {
//     if (!value) continue;

//     for (const lang of targetLangs) {
//       const translatedField = `${fieldName}_${lang}`;
//       const translatedText = await translateText(value, LANGUAGE_CODES[lang]);
//       updates[translatedField] = translatedText;
//     }
//   }

//   await (prisma as any)[table].update({
//     where: { id },
//     data: updates,
//   });
// }

// export async function translateJobs() {
//   const jobs = await prisma.job.findMany({
//     where: {
//       OR: [{ title_ms: null }, { title_zh: null }, { title_ta: null }],
//     },
//     select: {
//       id: true,
//       title: true,
//       description: true,
//       requirements: true,
//       benefits: true,
//     },
//   });

//   await Promise.allSettled(
//     jobs.map((job) =>
//       translateFieldSet(
//         'job',
//         job.id,
//         {
//           title: job.title,
//           description: job.description,
//           requirements: job.requirements,
//           benefits: job.benefits,
//         },
//         ['ms', 'zh', 'ta']
//       )
//     )
//   );
// }

// export async function translateIndustries() {
//   const industries = await prisma.industry.findMany({
//     where: {
//       OR: [{ name_ms: null }, { name_zh: null }, { name_ta: null }],
//     },
//     select: {
//       id: true,
//       name: true,
//       description: true,
//     },
//   });

//   await Promise.allSettled(
//     industries.map((industry) =>
//       translateFieldSet(
//         'industry',
//         industry.id,
//         {
//           name: industry.name,
//           description: industry.description,
//         },
//         ['ms', 'zh', 'ta']
//       )
//     )
//   );
// }

// export async function translateCompanies() {
//   const companies = await prisma.company.findMany({
//     where: {
//       OR: [{ name_ms: null }, { name_zh: null }, { name_ta: null }],
//     },
//     select: {
//       id: true,
//       name: true,
//       description: true,
//     },
//   });

//   await Promise.allSettled(
//     companies.map((company) =>
//       translateFieldSet(
//         'company',
//         company.id,
//         {
//           name: company.name,
//           description: company.description,
//         },
//         ['ms', 'zh', 'ta']
//       )
//     )
//   );
// }

// export async function translateSkills() {
//   const skills = await prisma.skill.findMany({
//     where: {
//       OR: [{ name_ms: null }, { name_zh: null }, { name_ta: null }],
//     },
//     select: { id: true, name: true },
//   });

//   await Promise.allSettled(
//     skills.map((skill) =>
//       translateFieldSet('skill', skill.id, { name: skill.name }, [
//         'ms',
//         'zh',
//         'ta',
//       ])
//     )
//   );
// }

// export async function translateLanguages() {
//   const languages = await prisma.language.findMany({
//     where: {
//       OR: [{ name_ms: null }, { name_zh: null }, { name_ta: null }],
//     },
//     select: { id: true, name: true },
//   });

//   await Promise.allSettled(
//     languages.map((lang) =>
//       translateFieldSet('language', lang.id, { name: lang.name }, [
//         'ms',
//         'zh',
//         'ta',
//       ])
//     )
//   );
// }

// async function main() {
//   console.log('🌍 Starting translation process...');

//   await translateJobs();
//   await translateIndustries();
//   await translateCompanies();
//   await translateSkills();
//   await translateLanguages();

//   console.log('✅ Translation process complete!');
// }

// main()
//   .catch(console.error)
//   .finally(async () => await prisma.$disconnect());
import { PrismaClient } from '@prisma/client';
import { translateText } from '../services/googleTranslation';

const prisma = new PrismaClient();
const LANGUAGE_CODES = {
  ms: 'ms',
  zh: 'zh',
  ta: 'ta',
} as const;

type LangKey = keyof typeof LANGUAGE_CODES; // 'ms' | 'zh' | 'ta'

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
      OR: [{ title_ms: null }, { title_zh: null }, { title_ta: null }],
    },
    select: {
      id: true,
      title: true,
      description: true,
      requirements: true,
      benefits: true,
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
        },
        ['ms', 'zh', 'ta']
      )
    )
  );

  console.log(`✅ Jobs translation complete`);
}

/**
 * Translates all industries that don't have translations
 */
export async function translateIndustries() {
  const industries = await prisma.industry.findMany({
    where: {
      OR: [{ name_ms: null }, { name_zh: null }, { name_ta: null }],
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
        ['ms', 'zh', 'ta']
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
      OR: [{ name_ms: null }, { name_zh: null }, { name_ta: null }],
    },
    select: {
      id: true,
      name: true,
      description: true,
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
        },
        ['ms', 'zh', 'ta']
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
      OR: [{ name_ms: null }, { name_zh: null }, { name_ta: null }],
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
      OR: [{ name_ms: null }, { name_zh: null }, { name_ta: null }],
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

  console.log('✅ Translation process complete!');
}

// Only run main if this file is executed directly
if (require.main === module) {
  main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
}
