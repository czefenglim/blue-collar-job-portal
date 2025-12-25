import { Request, Response } from 'express';
import { ApplicantQualityService } from '../services/applicantQualityService';
import { SalaryCompetitivenessService } from '../services/salaryCompetitivenessService';
import { SupportedLang } from '../utils/enumLabels';
import { AuthRequest } from '../types/common';

/**
 * Get quality score for a specific application
 * GET /api/employer/applicants/:id/quality-score
 */
export const getApplicantQualityScore = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const applicationId = parseInt(req.params.id);
    const langParam = (req.query.lang as string) || 'en';
    const lang: SupportedLang = ['en', 'ms', 'zh', 'ta'].includes(langParam)
      ? (langParam as SupportedLang)
      : 'en';

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID',
      });
    }

    const qualityScore = await ApplicantQualityService.calculateQualityScore(
      applicationId
    );

    // Localize strengths and improvements
    const localizedStrengths = (qualityScore.strengths || []).map((s) =>
      localizeQualityText(s, lang)
    );
    const localizedImprovements = (qualityScore.improvements || []).map((i) =>
      localizeQualityText(i, lang)
    );

    return res.status(200).json({
      success: true,
      data: {
        ...qualityScore,
        strengths: localizedStrengths,
        improvements: localizedImprovements,
      },
    });
  } catch (error: any) {
    console.error('Error calculating quality score:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate quality score',
    });
  }
};

/**
 * Get quality scores for all applicants of a job
 * GET /api/employer/jobs/:jobId/applicant-scores
 */
export const getJobApplicantScores = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const jobId = parseInt(req.params.jobId);

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID',
      });
    }

    const scores = await ApplicantQualityService.getQualityScoresForJob(jobId);

    // Convert Map to object for JSON response
    const scoresObject: Record<number, any> = {};
    scores.forEach((value, key) => {
      scoresObject[key] = value;
    });

    return res.status(200).json({
      success: true,
      data: scoresObject,
    });
  } catch (error: any) {
    console.error('Error getting applicant scores:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get applicant scores',
    });
  }
};

/**
 * Analyze salary competitiveness
 * POST /api/jobs/analyze-salary
 */
export const analyzeSalaryCompetitiveness = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const {
      industryId,
      state,
      experienceLevel,
      salaryMin,
      salaryMax,
      jobType,
    } = req.body;

    // Validate required fields
    if (!industryId || !state || !experienceLevel) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: industryId, state, experienceLevel',
      });
    }

    const analysis = await SalaryCompetitivenessService.analyzeSalary({
      industryId,
      state,
      experienceLevel,
      salaryMin,
      salaryMax,
      jobType,
    });

    return res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    console.error('Error analyzing salary:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to analyze salary',
    });
  }
};

// Helper: localize dynamic/static quality messages
function localizeQualityText(text: string, lang: SupportedLang): string {
  if (lang === 'en') return text;

  // Dynamic patterns
  const yearMatch = text.match(
    /Experience level matches job requirements \((\d+) years\)/
  );
  const skillsStrongMatch = text.match(
    /Strong skills match \((\d+)\/(\d+) required skills\)/
  );
  const skillsGoodMatch = text.match(
    /Good skills match \((\d+)\/(\d+) required skills\)/
  );
  const hasSkillsMatch = text.match(/Has (\d+) relevant skills/);

  // Malay (ms)
  if (lang === 'ms') {
    if (yearMatch) {
      const years = yearMatch[1];
      return `Tahap pengalaman sepadan dengan keperluan kerja (${years} tahun)`;
    }
    if (skillsStrongMatch) {
      const a = skillsStrongMatch[1];
      const b = skillsStrongMatch[2];
      return `Padanan kemahiran yang kuat (${a}/${b} kemahiran diperlukan)`;
    }
    if (skillsGoodMatch) {
      const a = skillsGoodMatch[1];
      const b = skillsGoodMatch[2];
      return `Padanan kemahiran yang baik (${a}/${b} kemahiran diperlukan)`;
    }
    if (hasSkillsMatch) {
      const n = hasSkillsMatch[1];
      return `Mempunyai ${n} kemahiran yang berkaitan`;
    }
    switch (text) {
      case 'Complete profile with all key information':
        return 'Profil lengkap dengan semua maklumat penting';
      case 'Complete profile to improve visibility':
        return 'Lengkapkan profil untuk meningkatkan keterlihatan';
      case 'No profile information available':
        return 'Tiada maklumat profil tersedia';
      case 'Experience level is close to requirements':
        return 'Tahap pengalaman hampir memenuhi keperluan';
      case 'Exceeds experience requirements':
        return 'Melebihi keperluan pengalaman';
      case 'Gain more experience in the field':
        return 'Tambahkan lebih banyak pengalaman dalam bidang ini';
      case 'Develop more relevant skills for this role':
        return 'Bangunkan lebih banyak kemahiran yang berkaitan untuk peranan ini';
      case 'Limited skills match - consider upskilling':
        return 'Padanan kemahiran terhad - pertimbangkan penambahbaikan kemahiran';
      case 'Add skills to profile':
        return 'Tambahkan kemahiran pada profil';
      case 'Remote work available':
        return 'Kerja jarak jauh tersedia';
      case 'Located in the same city as job':
        return 'Berada di bandar yang sama dengan pekerjaan';
      case 'Located in the same state':
        return 'Berada di negeri yang sama';
      case 'Consider relocation or apply for remote positions':
        return 'Pertimbangkan berpindah atau mohon jawatan jarak jauh';
      case 'Add location to profile':
        return 'Tambahkan lokasi pada profil';
      case 'Resume uploaded':
        return 'Resume dimuat naik';
      case 'Upload resume to strengthen application':
        return 'Muat naik resume untuk mengukuhkan permohonan';
      case 'Personalized cover letter':
        return 'Surat iringan peribadi';
      case 'Add a detailed cover letter':
        return 'Tambah surat iringan yang terperinci';
      case 'Industry preference matches job':
        return 'Pilihan industri sepadan dengan pekerjaan';
      default:
        return text;
    }
  }

  // Chinese (zh)
  if (lang === 'zh') {
    if (yearMatch) {
      const years = yearMatch[1];
      return `经验水平符合职位要求（${years} 年）`;
    }
    if (skillsStrongMatch) {
      const a = skillsStrongMatch[1];
      const b = skillsStrongMatch[2];
      return `技能匹配度高（${a}/${b} 项必需技能）`;
    }
    if (skillsGoodMatch) {
      const a = skillsGoodMatch[1];
      const b = skillsGoodMatch[2];
      return `技能匹配度良好（${a}/${b} 项必需技能）`;
    }
    if (hasSkillsMatch) {
      const n = hasSkillsMatch[1];
      return `拥有 ${n} 项相关技能`;
    }
    switch (text) {
      case 'Complete profile with all key information':
        return '个人资料包含所有关键信息';
      case 'Complete profile to improve visibility':
        return '完善资料以提升曝光度';
      case 'No profile information available':
        return '暂无个人资料信息';
      case 'Experience level is close to requirements':
        return '经验水平接近职位要求';
      case 'Exceeds experience requirements':
        return '超过经验要求';
      case 'Gain more experience in the field':
        return '在该领域积累更多经验';
      case 'Develop more relevant skills for this role':
        return '提升与该职位相关的技能';
      case 'Limited skills match - consider upskilling':
        return '技能匹配度有限 - 建议提升技能';
      case 'Add skills to profile':
        return '在资料中添加技能';
      case 'Remote work available':
        return '可远程工作';
      case 'Located in the same city as job':
        return '与职位在同一城市';
      case 'Located in the same state':
        return '与职位在同一州属';
      case 'Consider relocation or apply for remote positions':
        return '考虑搬迁或申请远程职位';
      case 'Add location to profile':
        return '在资料中添加所在地信息';
      case 'Resume uploaded':
        return '已上传简历';
      case 'Upload resume to strengthen application':
        return '上传简历以增强申请';
      case 'Personalized cover letter':
        return '个性化求职信';
      case 'Add a detailed cover letter':
        return '添加详细的求职信';
      case 'Industry preference matches job':
        return '行业偏好与职位匹配';
      default:
        return text;
    }
  }

  // Tamil (ta)
  if (lang === 'ta') {
    if (yearMatch) {
      const years = yearMatch[1];
      return `அனுபவ நிலை வேலை தேவைகளுக்கு பொருந்துகிறது (${years} ஆண்டுகள்)`;
    }
    if (skillsStrongMatch) {
      const a = skillsStrongMatch[1];
      const b = skillsStrongMatch[2];
      return `வலுவான திறன் பொருத்தம் (${a}/${b} தேவையான திறன்கள்)`;
    }
    if (skillsGoodMatch) {
      const a = skillsGoodMatch[1];
      const b = skillsGoodMatch[2];
      return `நல்ல திறன் பொருத்தம் (${a}/${b} தேவையான திறன்கள்)`;
    }
    if (hasSkillsMatch) {
      const n = hasSkillsMatch[1];
      return `${n} தொடர்புடைய திறன்கள் உள்ளன`;
    }
    switch (text) {
      case 'Complete profile with all key information':
        return 'முக்கிய தகவல்கள் அனைத்தும் உள்ள முழுமையான சுயவிவரம்';
      case 'Complete profile to improve visibility':
        return 'காண்பதை மேம்படுத்த சுயவிவரத்தை நிரப்பவும்';
      case 'No profile information available':
        return 'சுயவிவரத் தகவல் கிடைக்கவில்லை';
      case 'Experience level is close to requirements':
        return 'அனுபவ நிலை தேவைகளுக்கு நெருக்கமாக உள்ளது';
      case 'Exceeds experience requirements':
        return 'அனுபவ தேவைகளை மீறுகிறது';
      case 'Gain more experience in the field':
        return 'இந்த துறையில் மேலும் அனுபவம் பெறவும்';
      case 'Develop more relevant skills for this role':
        return 'இந்தப் பதவிக்கான தொடர்புடைய திறன்களை மேம்படுத்தவும்';
      case 'Limited skills match - consider upskilling':
        return 'குறைந்த திறன் பொருத்தம் - திறன் மேம்பாட்டை பரிசீலிக்கவும்';
      case 'Add skills to profile':
        return 'சுயவிவரத்தில் திறன்களை சேர்க்கவும்';
      case 'Remote work available':
        return 'தொலைவேலை கிடைக்கிறது';
      case 'Located in the same city as job':
        return 'வேலையுடன் அதே நகரத்தில் உள்ளார்';
      case 'Located in the same state':
        return 'வேலையுடன் அதே மாநிலத்தில் உள்ளார்';
      case 'Consider relocation or apply for remote positions':
        return 'மாற்றம் செய்ய அல்லது தொலைவேலைக்கு விண்ணப்பிக்க பரிசீலிக்கவும்';
      case 'Add location to profile':
        return 'சுயவிவரத்தில் இருப்பிடத்தைச் சேர்க்கவும்';
      case 'Resume uploaded':
        return 'சுருக்கவிவரம் பதிவேற்றப்பட்டது';
      case 'Upload resume to strengthen application':
        return 'விண்ணப்பத்தை வலுப்படுத்த சுருக்கவிவரத்தை பதிவேற்றவும்';
      case 'Personalized cover letter':
        return 'தனிப்பயன் கவர் கடிதம்';
      case 'Add a detailed cover letter':
        return 'விரிவான கவர் கடிதத்தைச் சேர்க்கவும்';
      case 'Industry preference matches job':
        return 'தொழில் விருப்பம் வேலைக்கு பொருந்துகிறது';
      default:
        return text;
    }
  }

  return text;
}
