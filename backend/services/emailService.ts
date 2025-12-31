import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
// Use SENDGRID_FROM_EMAIL if available, otherwise fall back to SMTP_USER or default
const SENDGRID_FROM_EMAIL =
  process.env.SENDGRID_FROM_EMAIL ||
  process.env.SMTP_USER ||
  'czefenglim@gmail.com';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

function isSendGridConfigured() {
  return !!SENDGRID_API_KEY;
}

function buildEmailContent(
  preferredLanguage: string | undefined,
  otp: string
): { subject: string; text: string; html?: string } {
  const lang = (preferredLanguage || 'ENGLISH').toUpperCase();
  switch (lang) {
    case 'CHINESE':
    case 'ZH':
      return {
        subject: '密码重置验证码',
        text: `您的密码重置验证码是 ${otp}。该验证码在 10 分钟后过期。`,
        html: `<p>您的密码重置验证码是 <strong>${otp}</strong>。该验证码在 <strong>10 分钟</strong>后过期。</p>`,
      };
    case 'MALAY':
    case 'MS':
      return {
        subject: 'Kod Tetapan Semula Kata Laluan',
        text: `Kod tetapan semula kata laluan anda ialah ${otp}. Kod ini akan tamat dalam 10 minit.`,
        html: `<p>Kod tetapan semula kata laluan anda ialah <strong>${otp}</strong>. Kod ini akan tamat dalam <strong>10 minit</strong>.</p>`,
      };
    case 'TAMIL':
    case 'TA':
      return {
        subject: 'கடவுச்சொல் மாற்றும் குறியீடு',
        text: `உங்கள் கடவுச்சொல்லை மாற்றுவதற்கான குறியீடு ${otp}. இது 10 நிமிடங்களில் காலாவதியாகும்.`,
        html: `<p>உங்கள் கடவுச்சொல்லை மாற்றுவதற்கான குறியீடு <strong>${otp}</strong>. இது <strong>10 நிமிடங்களில்</strong> காலாவதியாகும்.</p>`,
      };
    default:
      return {
        subject: 'Password Reset Code',
        text: `Your password reset code is ${otp}. It expires in 10 minutes.`,
        html: `<p>Your password reset code is <strong>${otp}</strong>. It expires in <strong>10 minutes</strong>.</p>`,
      };
  }
}

function buildRegistrationEmailContent(
  preferredLanguage: string | undefined,
  otp: string
): { subject: string; text: string; html?: string } {
  const lang = (preferredLanguage || 'ENGLISH').toUpperCase();
  switch (lang) {
    case 'CHINESE':
    case 'ZH':
      return {
        subject: '注册验证码',
        text: `您的注册验证码是 ${otp}。该验证码在 10 分钟后过期。`,
        html: `<p>您的注册验证码是 <strong>${otp}</strong>。该验证码在 <strong>10 分钟</strong>后过期。</p>`,
      };
    case 'MALAY':
    case 'MS':
      return {
        subject: 'Kod Pengesahan Pendaftaran',
        text: `Kod pengesahan pendaftaran anda ialah ${otp}. Kod ini akan tamat dalam 10 minit.`,
        html: `<p>Kod pengesahan pendaftaran anda ialah <strong>${otp}</strong>. Kod ini akan tamat dalam <strong>10 minit</strong>.</p>`,
      };
    case 'TAMIL':
    case 'TA':
      return {
        subject: 'பதிவு சரிபார்ப்புக் குறியீடு',
        text: `உங்கள் பதிவு சரிபார்ப்புக் குறியீடு ${otp}. இது 10 நிமிடங்களில் காலாவதியாகும்.`,
        html: `<p>உங்கள் பதிவு சரிபார்ப்புக் குறியீடு <strong>${otp}</strong>. இது <strong>10 நிமிடங்களில்</strong> காலாவதியாகும்.</p>`,
      };
    default:
      return {
        subject: 'Registration Verification Code',
        text: `Your registration verification code is ${otp}. It expires in 10 minutes.`,
        html: `<p>Your registration verification code is <strong>${otp}</strong>. It expires in <strong>10 minutes</strong>.</p>`,
      };
  }
}

export async function sendEmailOtp(
  to: string,
  otp: string,
  preferredLanguage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSendGridConfigured()) {
      console.warn(
        '[emailService] SendGrid API Key not configured. Simulating email send.'
      );
      console.log(
        `[emailService] SIMULATED Email -> To: ${to}, OTP: ${otp}, Lang: ${preferredLanguage}`
      );
      return { success: true };
    }

    const { subject, text, html } = buildEmailContent(preferredLanguage, otp);

    const msg = {
      to,
      from: SENDGRID_FROM_EMAIL,
      subject,
      text,
      html,
    };

    await sgMail.send(msg);

    console.log('[emailService] Email sent to:', to);
    return { success: true };
  } catch (error: any) {
    console.error('[emailService] sendEmailOtp exception:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

export async function sendRegistrationOtp(
  to: string,
  otp: string,
  preferredLanguage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSendGridConfigured()) {
      console.warn(
        '[emailService] SendGrid API Key not configured. Simulating email send.'
      );
      console.log(
        `[emailService] SIMULATED Registration Email -> To: ${to}, OTP: ${otp}, Lang: ${preferredLanguage}`
      );
      return { success: true };
    }

    const { subject, text, html } = buildRegistrationEmailContent(
      preferredLanguage,
      otp
    );

    const msg = {
      to,
      from: SENDGRID_FROM_EMAIL,
      subject,
      text,
      html,
    };

    await sgMail.send(msg);

    console.log('[emailService] Registration Email sent to:', to);
    return { success: true };
  } catch (error: any) {
    console.error('[emailService] sendRegistrationOtp exception:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    return { success: false, error: error?.message || 'Unknown error' };
  }
}
