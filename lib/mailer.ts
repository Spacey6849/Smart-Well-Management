import nodemailer from 'nodemailer';

// Expect env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
export function getTransport() {
  if (!process.env.SMTP_HOST) throw new Error('SMTP_HOST not set');
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
}

export async function sendVerificationEmail(to: string, token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verifyUrl = `${base}/api/auth/verify?token=${encodeURIComponent(token)}`;
  const transport = getTransport();
  await transport.sendMail({
    from: process.env.MAIL_FROM || 'no-reply@ecowell.local',
    to,
    subject: 'Verify your EcoWell email',
    text: `Click to verify: ${verifyUrl}`,
    html: `<p>Click to verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`
  });
}
