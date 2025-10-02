import nodemailer from 'nodemailer';

// Expect env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
export function getTransport() {
  const env = process.env as Record<string, string | undefined>;
  const host = env['SMTP_HOST'];
  if (!host) throw new Error('SMTP_HOST not set');
  const port = parseInt(env['SMTP_PORT'] || '587', 10);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: env['SMTP_USER'] ? { user: env['SMTP_USER']!, pass: env['SMTP_PASS'] } : undefined,
  });
}

export async function sendVerificationEmail(to: string, token: string) {
  const env = process.env as Record<string, string | undefined>;
  const base = env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000';
  // Use /auth/verify page route (which should call API internally) for UX, adjust if direct API is desired
  const verifyUrl = `${base}/auth/verify?token=${encodeURIComponent(token)}`;
  const transport = getTransport();
  await transport.sendMail({
    from: env['MAIL_FROM'] || 'no-reply@ecowell.local',
    to,
    subject: 'Verify your EcoWell email',
    text: `Click to verify: ${verifyUrl}`,
    html: `<p>Click to verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const env = process.env as Record<string, string | undefined>;
  const base = env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000';
  const resetUrl = `${base}/auth/reset?token=${encodeURIComponent(token)}`;
  const transport = getTransport();
  await transport.sendMail({
    from: env['MAIL_FROM'] || 'no-reply@ecowell.local',
    to,
    subject: 'Reset your EcoWell password',
    text: `You requested a password reset. If this was you, click to reset: ${resetUrl}. If not, ignore this email.`,
    html: `<p>You requested a password reset. If this was you, click the link below:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can safely ignore this email.</p>`
  });
}

// Send alert email when a well enters warning or critical status.
// Provide key metrics & quick guidance.
interface WellAlertOptions {
  to: string; // recipient email
  well: {
    id: string;
    name: string;
    status: 'warning' | 'critical';
    panchayat_name?: string | null;
    village_name?: string | null;
    lat?: number | null;
    lng?: number | null;
  };
  metrics?: {
    ph?: number | null;
    tds?: number | null;
    temperature?: number | null;
    waterLevel?: number | null;
    recordedAt?: Date | string | null;
  };
  previousStatus?: string | null; // to indicate transition
}

export async function sendWellStatusAlertEmail(opts: WellAlertOptions) {
  const { to, well, metrics, previousStatus } = opts;
  const env = process.env as Record<string, string | undefined>;
  const base = env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000';
  const transport = getTransport();
  const locBits = [well.village_name, well.panchayat_name].filter(Boolean).join(', ');
  const coord = (well.lat != null && well.lng != null) ? `(${well.lat.toFixed(5)}, ${well.lng.toFixed(5)})` : '';
  const statusLabel = well.status.toUpperCase();
  const transitionLine = previousStatus && previousStatus !== well.status
    ? `Status changed: ${previousStatus.toUpperCase()} → ${statusLabel}`
    : `Status: ${statusLabel}`;
  const m = metrics || {};
  const rows: string[] = [];
  if (m.ph != null) rows.push(`pH Level: ${m.ph}`);
  if (m.tds != null) rows.push(`TDS: ${m.tds} ppm`);
  if (m.temperature != null) rows.push(`Temperature: ${m.temperature} °C`);
  if (m.waterLevel != null) rows.push(`Water Level: ${m.waterLevel} m`);
  const recordedAtStr = m.recordedAt ? new Date(m.recordedAt).toLocaleString() : null;
  const metricsSectionText = rows.length ? rows.join('\n') : 'No recent metrics available.';
  const metricsSectionHtml = rows.length
    ? `<ul style="margin:0;padding-left:16px;">${rows.map(r=>`<li>${r}</li>`).join('')}</ul>`
    : '<p>No recent metrics available.</p>';
  const guidance = well.status === 'critical'
    ? 'Immediate attention recommended. Consider water quality testing, cleaning, or restricting usage until parameters stabilize.'
    : 'Monitor the well closely. Plan preventive maintenance if adverse trends continue.';
  const manageUrl = `${base}/maps?well=${encodeURIComponent(well.id)}`;
  const subject = `EcoWell Alert: ${well.name} is ${statusLabel}`;
  const text = `Well: ${well.name}\n${transitionLine}\nLocation: ${locBits || 'N/A'} ${coord}\n\nMetrics:\n${metricsSectionText}\n${recordedAtStr ? `Recorded: ${recordedAtStr}\n` : ''}\nGuidance: ${guidance}\n\nView: ${manageUrl}`;
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.4;">
    <h2 style="margin:0 0 8px;">EcoWell Alert</h2>
    <p style="margin:0 0 4px;"><strong>${well.name}</strong> ${locBits ? `(${locBits})` : ''} ${coord}</p>
    <p style="margin:4px 0;">${transitionLine}</p>
    <h3 style="margin:16px 0 4px;">Latest Metrics</h3>
    ${metricsSectionHtml}
    ${recordedAtStr ? `<p style="margin:4px 0;font-size:12px;color:#555;">Recorded: ${recordedAtStr}</p>` : ''}
    <p style="margin:16px 0 4px;"><strong>Guidance:</strong> ${guidance}</p>
    <p style="margin:16px 0 4px;"><a href="${manageUrl}" style="color:#2563eb;">View this well</a></p>
    <hr style="margin:24px 0; border:none; border-top:1px solid #eee;" />
    <p style="font-size:12px;color:#666;">You are receiving this email because you own or manage this well in EcoWell. Adjust alert preferences in your profile (feature coming soon).</p>
  </div>`;
  await transport.sendMail({
    from: env['MAIL_FROM'] || 'alerts@ecowell.local',
    to,
    subject,
    text,
    html
  });
}
