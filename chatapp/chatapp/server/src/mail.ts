import nodemailer from 'nodemailer';
import { config } from './config';

const { host, port, user, pass, from } = config.smtp;
const transporter = host
  ? nodemailer.createTransport({ host, port, secure: port === 465, auth: user ? { user, pass } : undefined })
  : null;

export async function sendOtpMail(to: string, otp: string) {
  if (!transporter) { console.log(`[DEV - SMTP not configured] OTP for ${to}: ${otp}`); return; }
  await transporter.sendMail({
    from, to,
    subject: `${otp} is your ChatApp verification code`,
    text: `Your ChatApp verification code is ${otp}. It expires in 10 minutes. If you didn't request it, ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px">
      <h2 style="margin:0 0 8px">Verify your email</h2>
      <p style="color:#475569">Enter this code in ChatApp to finish signing up:</p>
      <div style="font-size:34px;letter-spacing:8px;font-weight:700;background:#f1f5f9;border-radius:12px;padding:16px;text-align:center">${otp}</div>
      <p style="color:#64748b;font-size:13px">It expires in 10 minutes. If you didn't request it, you can ignore this email.</p></div>`,
  });
}