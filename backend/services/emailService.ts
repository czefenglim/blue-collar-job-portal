import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || 'czefenglim@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || '';

function isSmtpConfigured() {
  return !!SMTP_USER && !!SMTP_PASS;
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
    if (!isSmtpConfigured()) {
      console.warn(
        '[emailService] SMTP not configured. Simulating email send.'
      );
      console.log(
        `[emailService] SIMULATED Email -> To: ${to}, OTP: ${otp}, Lang: ${preferredLanguage}`
      );
      return { success: true };
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const { subject, text, html } = buildEmailContent(preferredLanguage, otp);

    const info = await transporter.sendMail({
      from: SMTP_USER,
      to,
      subject,
      text,
      html,
    });

    console.log('[emailService] Email sent:', info.messageId);
    return { success: true };
  } catch (error: any) {
    console.error('[emailService] sendEmailOtp exception:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

export async function sendRegistrationOtp(
  to: string,
  otp: string,
  preferredLanguage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSmtpConfigured()) {
      console.warn(
        '[emailService] SMTP not configured. Simulating email send.'
      );
      console.log(
        `[emailService] SIMULATED Registration Email -> To: ${to}, OTP: ${otp}, Lang: ${preferredLanguage}`
      );
      return { success: true };
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const { subject, text, html } = buildRegistrationEmailContent(
      preferredLanguage,
      otp
    );

    const info = await transporter.sendMail({
      from: SMTP_USER,
      to,
      subject,
      text,
      html,
    });

    console.log('[emailService] Registration Email sent:', info.messageId);
    return { success: true };
  } catch (error: any) {
    console.error('[emailService] sendRegistrationOtp exception:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}
