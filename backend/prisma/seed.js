const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Seed Industries
  const industries = [
    {
      name: 'Electrician Industrial',
      slug: 'electrician-industrial',
      icon: '⚡',
    },
    { name: 'Wood Worker', slug: 'wood-worker', icon: '🪵' },
    { name: 'Construction', slug: 'construction', icon: '🏗️' },
    { name: 'Plumbing', slug: 'plumbing', icon: '🔧' },
    { name: 'Welding', slug: 'welding', icon: '🔥' },
    { name: 'HVAC', slug: 'hvac', icon: '❄️' },
    { name: 'Manufacturing', slug: 'manufacturing', icon: '🏭' },
    { name: 'Automotive', slug: 'automotive', icon: '🚗' },
    { name: 'Logistics', slug: 'logistics', icon: '📦' },
    { name: 'Cleaning Services', slug: 'cleaning-services', icon: '🧹' },
  ];

  for (const industry of industries) {
    await prisma.industry.upsert({
      where: { slug: industry.slug },
      update: {},
      create: industry,
    });
  }
  console.log('✅ Industries seeded');

  // Seed Companies
  const companies = [
    {
      name: 'Pro Resources Staffing',
      slug: 'pro-resources-staffing',
      description: 'Leading staffing solutions for blue-collar workforce',
      city: 'Kuala Lumpur',
      state: 'Wilayah Persekutuan',
      companySize: 'MEDIUM',
      isVerified: true,
    },
    {
      name: 'Alaant Workforce Solutions',
      slug: 'alaant-workforce-solutions',
      description: 'Comprehensive workforce management services',
      city: 'Petaling Jaya',
      state: 'Selangor',
      companySize: 'LARGE',
      isVerified: true,
    },
    {
      name: 'BuildTech Construction',
      slug: 'buildtech-construction',
      description: 'Premier construction and development company',
      city: 'Johor Bahru',
      state: 'Johor',
      companySize: 'MEDIUM',
      isVerified: true,
    },
    {
      name: 'TechWeld Industries',
      slug: 'techweld-industries',
      description: 'Advanced welding and fabrication services',
      city: 'Shah Alam',
      state: 'Selangor',
      companySize: 'SMALL',
      isVerified: true,
    },
    {
      name: 'Malaysia Manufacturing Corp',
      slug: 'malaysia-manufacturing-corp',
      description: 'Leading manufacturing solutions provider',
      city: 'Penang',
      state: 'Penang',
      companySize: 'ENTERPRISE',
      isVerified: true,
    },
  ];

  for (const company of companies) {
    await prisma.company.upsert({
      where: { slug: company.slug },
      update: {},
      create: company,
    });
  }
  console.log('✅ Companies seeded');

  // Get industries and companies for job creation
  const electricianIndustry = await prisma.industry.findUnique({
    where: { slug: 'electrician-industrial' },
  });
  const constructionIndustry = await prisma.industry.findUnique({
    where: { slug: 'construction' },
  });
  const woodWorkerIndustry = await prisma.industry.findUnique({
    where: { slug: 'wood-worker' },
  });
  const weldingIndustry = await prisma.industry.findUnique({
    where: { slug: 'welding' },
  });
  const manufacturingIndustry = await prisma.industry.findUnique({
    where: { slug: 'manufacturing' },
  });

  const proResources = await prisma.company.findUnique({
    where: { slug: 'pro-resources-staffing' },
  });
  const alaant = await prisma.company.findUnique({
    where: { slug: 'alaant-workforce-solutions' },
  });
  const buildTech = await prisma.company.findUnique({
    where: { slug: 'buildtech-construction' },
  });
  const techWeld = await prisma.company.findUnique({
    where: { slug: 'techweld-industries' },
  });
  const malaysiaMfg = await prisma.company.findUnique({
    where: { slug: 'malaysia-manufacturing-corp' },
  });

  // Seed Jobs
  const jobs = [
    {
      title: 'Packer/Cleaner',
      slug: 'packer-cleaner-argos-in',
      description:
        'We are seeking dedicated Packers and Cleaners to join our warehouse team. Responsibilities include packing products, maintaining cleanliness, and ensuring quality standards.',
      requirements:
        'No experience required. Must be reliable and able to work in a fast-paced environment.',
      benefits:
        'Competitive hourly rate, overtime opportunities, transportation assistance.',
      industryId: manufacturingIndustry.id,
      companyId: proResources.id,
      jobType: 'PART_TIME',
      workingHours: 'DAY_SHIFT',
      experienceLevel: 'ENTRY_LEVEL',
      city: 'Argos',
      state: 'Selangor',
      postcode: '47000',
      salaryMin: 1800,
      salaryMax: 2200,
      salaryType: 'MONTHLY',
      isActive: true,
      isFeatured: true,
      createdAt: new Date(Date.now() - 270 * 24 * 60 * 60 * 1000), // 9 months ago
    },
    {
      title: 'Production Supervisor - Third Shift',
      slug: 'production-supervisor-third-shift',
      description:
        'Looking for experienced Production Supervisor to oversee third shift operations. Manage team of 15-20 workers, ensure production targets are met, and maintain safety standards.',
      requirements:
        '2+ years supervisory experience in manufacturing. Strong leadership and communication skills required.',
      benefits:
        'Shift allowance, medical insurance, annual bonus, career advancement opportunities.',
      industryId: manufacturingIndustry.id,
      companyId: alaant.id,
      jobType: 'FULL_TIME',
      workingHours: 'NIGHT_SHIFT',
      experienceLevel: 'MID_LEVEL',
      city: 'Petaling Jaya',
      state: 'Selangor',
      postcode: '46000',
      salaryMin: 3500,
      salaryMax: 4500,
      salaryType: 'MONTHLY',
      isActive: true,
      isFeatured: true,
      createdAt: new Date(Date.now() - 270 * 24 * 60 * 60 * 1000), // 9 months ago
    },
    {
      title: 'Industrial Electrician',
      slug: 'industrial-electrician-kl',
      description:
        'Experienced electrician needed for industrial facility maintenance. Install, maintain, and repair electrical systems and equipment.',
      requirements:
        'Valid electrician license, 3+ years experience in industrial settings, knowledge of PLC systems.',
      benefits:
        'RM 3,000-4,500/month, EPF, SOCSO, medical coverage, tools provided.',
      industryId: electricianIndustry.id,
      companyId: malaysiaMfg.id,
      jobType: 'FULL_TIME',
      workingHours: 'ROTATING_SHIFT',
      experienceLevel: 'SENIOR',
      city: 'Kuala Lumpur',
      state: 'Wilayah Persekutuan',
      postcode: '50000',
      salaryMin: 3000,
      salaryMax: 4500,
      salaryType: 'MONTHLY',
      isActive: true,
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 1.5 months ago
    },
    {
      title: 'Construction Worker',
      slug: 'construction-worker-jb',
      description:
        'Join our construction team for residential and commercial projects. General construction duties including carpentry, concrete work, and site preparation.',
      requirements:
        'Basic construction experience preferred. Must be physically fit and willing to work outdoors.',
      benefits:
        'Daily wage RM 80-120, accommodation provided, overtime pay, meal allowance.',
      industryId: constructionIndustry.id,
      companyId: buildTech.id,
      jobType: 'CONTRACT',
      workingHours: 'DAY_SHIFT',
      experienceLevel: 'ENTRY_LEVEL',
      city: 'Johor Bahru',
      state: 'Johor',
      postcode: '80000',
      salaryMin: 80,
      salaryMax: 120,
      salaryType: 'DAILY',
      isActive: true,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    },
    {
      title: 'Welder - MIG/TIG',
      slug: 'welder-mig-tig-shah-alam',
      description:
        'Skilled welder needed for metal fabrication projects. Must be proficient in MIG and TIG welding techniques.',
      requirements:
        'Certified welder with 2+ years experience. Able to read technical drawings. Safety certification required.',
      benefits:
        'Competitive salary RM 2,800-3,800, performance bonus, safety equipment provided.',
      industryId: weldingIndustry.id,
      companyId: techWeld.id,
      jobType: 'FULL_TIME',
      workingHours: 'DAY_SHIFT',
      experienceLevel: 'MID_LEVEL',
      city: 'Shah Alam',
      state: 'Selangor',
      postcode: '40000',
      salaryMin: 2800,
      salaryMax: 3800,
      salaryType: 'MONTHLY',
      isActive: true,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    },
    {
      title: 'Carpenter - Furniture Maker',
      slug: 'carpenter-furniture-maker',
      description:
        'Custom furniture workshop seeks skilled carpenter. Create high-quality wooden furniture and cabinetry.',
      requirements:
        '3+ years carpentry experience. Knowledge of various wood types and joinery techniques.',
      benefits:
        'RM 2,500-3,500/month, project bonuses, modern workshop facilities.',
      industryId: woodWorkerIndustry.id,
      companyId: buildTech.id,
      jobType: 'FULL_TIME',
      workingHours: 'FLEXIBLE',
      experienceLevel: 'MID_LEVEL',
      city: 'Subang Jaya',
      state: 'Selangor',
      postcode: '47500',
      salaryMin: 2500,
      salaryMax: 3500,
      salaryType: 'MONTHLY',
      isActive: true,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
    {
      title: 'Warehouse Assistant',
      slug: 'warehouse-assistant-penang',
      description:
        'Warehouse operations assistant needed for inventory management, loading/unloading, and order fulfillment.',
      requirements:
        'Forklift license preferred. Basic computer skills. Able to lift 25kg.',
      benefits: 'RM 1,800-2,300/month, transport allowance, training provided.',
      industryId: manufacturingIndustry.id,
      companyId: malaysiaMfg.id,
      jobType: 'FULL_TIME',
      workingHours: 'DAY_SHIFT',
      experienceLevel: 'JUNIOR',
      city: 'Penang',
      state: 'Penang',
      postcode: '10000',
      salaryMin: 1800,
      salaryMax: 2300,
      salaryType: 'MONTHLY',
      isActive: true,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
  ];

  for (const job of jobs) {
    await prisma.job.upsert({
      where: { slug: job.slug },
      update: {},
      create: job,
    });
  }
  console.log('✅ Jobs seeded');

  // Seed Skills
  const skills = [
    'Electrical Installation',
    'PLC Programming',
    'Carpentry',
    'Welding',
    'Blueprint Reading',
    'Safety Compliance',
    'Heavy Machinery Operation',
    'Quality Control',
    'Forklift Operation',
    'Hand Tools',
    'Power Tools',
    'Construction',
    'Maintenance',
    'Assembly',
  ];

  for (const skillName of skills) {
    await prisma.skill.upsert({
      where: { name: skillName },
      update: {},
      create: { name: skillName },
    });
  }
  console.log('✅ Skills seeded');

  // Seed Languages
  const languages = [
    'Bahasa Malaysia',
    'English',
    'Mandarin',
    'Tamil',
    'Cantonese',
  ];

  for (const langName of languages) {
    await prisma.language.upsert({
      where: { name: langName },
      update: {},
      create: { name: langName },
    });
  }
  console.log('✅ Languages seeded');

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
