import nodemailer from 'nodemailer';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
export async function sendReset(email: string, token: string, nativeClient = false) {
  const link = nativeClient
    ? `fittrack://reset-password?token=${token}`
    : `${process.env.APP_ORIGIN || 'http://localhost:5173'}/reset-password?token=${token}`;
  const text = `Reset your FitTrack AI password using this link within 30 minutes:\n${link}\n\nIf you did not request this, ignore this email.`;
  if (process.env.SMTP_HOST) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === '465',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Reset your FitTrack AI password',
      text,
    });
  } else if (process.env.NODE_ENV !== 'production') {
    await mkdir(resolve('.data/mail'), { recursive: true });
    await writeFile(resolve('.data/mail', `${Date.now()}.txt`), `To: ${email}\n${text}`);
    console.log('Development reset email saved to .data/mail (never served publicly).');
  } else throw new Error('SMTP is not configured');
}
