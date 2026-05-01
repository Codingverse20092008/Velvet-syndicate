/**
 * otp.service.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Email OTP verification service.
 *
 * Responsibilities:
 *   - Generate a cryptographically random 6-digit OTP
 *   - Hash it with SHA-256 (never stored in plain)
 *   - Persist in otp_verifications (replacing any prior record for that email)
 *   - Send via Resend
 *   - Verify OTP: hash match + expiry + max-attempt checks
 *   - Mark user as email_verified on success
 */

import crypto from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { Resend } from 'resend';
import { db } from '../lib/db';
import { users, otpVerifications } from '../lib/schema';
import { env } from '../lib/env';
import { logger } from '../lib/logger';
import { NotFoundError, ValidationError } from '../lib/errors';

// ─── Constants ────────────────────────────────────────────────────────────────

const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;

// ─── Resend client ────────────────────────────────────────────────────────────

if (!env.RESEND_API_KEY) {
  logger.error('RESEND_API_KEY is missing from environment variables');
}

const resend = new Resend(env.RESEND_API_KEY);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generates a 6-digit numeric OTP string */
function generateOtp(): string {
  // crypto.randomInt(min, max) — max is exclusive
  const otp = crypto.randomInt(100_000, 1_000_000);
  return otp.toString();
}

/** SHA-256 hash an OTP — deterministic for verification */
function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/** ISO-8601 timestamp N minutes from now */
function expiresAt(minutes: number): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * sendOtp
 * Generates + stores + emails a fresh OTP for the given email.
 * Any existing OTP record for that email is deleted first (resend safety).
 */
export async function sendOtp(email: string): Promise<void> {
  const normalised = email.toLowerCase();

  // 1. Verify the user exists
  const user = await db.query.users.findFirst({
    where: eq(users.email, normalised),
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  // 2. Delete any previous OTP for this email (clean slate on resend)
  await db
    .delete(otpVerifications)
    .where(eq(otpVerifications.email, normalised));

  // 3. Generate OTP
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const id = crypto.randomUUID();

  // 4. Store hashed OTP
  await db.insert(otpVerifications).values({
    id,
    email: normalised,
    otpHash,
    expiresAt: expiresAt(OTP_EXPIRY_MINUTES),
    attempts: 0,
  });

  // 5. Send via Resend
  const fromEmail = env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  
  logger.info({ email: normalised, from: fromEmail }, 'Attempting to send OTP email');

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: normalised,
      subject: 'Your Velvet Syndicate verification code',
      html: buildEmailHtml(otp),
      text: `Your OTP is ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code.`,
    });

    if (error) {
      // Clean up the DB record so the user can retry cleanly
      await db.delete(otpVerifications).where(eq(otpVerifications.email, normalised));
      logger.error({ error, email: normalised }, 'Resend API returned an error');
      throw new ValidationError(`Failed to send OTP email: ${error.message}`);
    }

    logger.info({ email: normalised, resendId: data?.id }, 'OTP delivered successfully via Resend');
  } catch (err) {
    // Catch network errors or unexpected exceptions
    await db.delete(otpVerifications).where(eq(otpVerifications.email, normalised));
    logger.error({ err, email: normalised }, 'Unexpected error while sending email via Resend');
    
    if (err instanceof ValidationError) throw err;
    throw new Error('Failed to send OTP email due to an internal error. Please try again later.');
  }
}

/**
 * verifyOtp
 * Validates the submitted OTP, marks user as email_verified, and cleans up.
 *
 * Throws ValidationError for:
 *   - No OTP record found (never sent / already used)
 *   - Expired OTP
 *   - Too many failed attempts
 *   - Invalid OTP (hash mismatch)
 */
export async function verifyOtp(email: string, otp: string): Promise<void> {
  const normalised = email.toLowerCase();

  // 1. Fetch the OTP record
  const record = await db.query.otpVerifications.findFirst({
    where: eq(otpVerifications.email, normalised),
  });

  if (!record) {
    throw new ValidationError('No OTP found for this email. Please request a new one.');
  }

  // 2. Check expiry
  if (new Date(record.expiresAt) < new Date()) {
    await db.delete(otpVerifications).where(eq(otpVerifications.email, normalised));
    throw new ValidationError('OTP has expired. Please request a new one.');
  }

  // 3. Check max attempts (before incrementing so the 5th attempt is still allowed)
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await db.delete(otpVerifications).where(eq(otpVerifications.email, normalised));
    throw new ValidationError('Too many failed attempts. Please request a new OTP.');
  }

  // 4. Hash the submitted OTP and compare
  const submittedHash = hashOtp(otp.trim());

  if (submittedHash !== record.otpHash) {
    // Increment attempts
    await db
      .update(otpVerifications)
      .set({ attempts: record.attempts + 1 })
      .where(eq(otpVerifications.email, normalised));

    const remaining = OTP_MAX_ATTEMPTS - (record.attempts + 1);
    throw new ValidationError(
      remaining > 0
        ? `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Invalid OTP. No attempts remaining — please request a new one.',
    );
  }

  // 5. OTP is valid — delete the record and mark user as verified
  await db.delete(otpVerifications).where(eq(otpVerifications.email, normalised));

  await db
    .update(users)
    .set({ emailVerified: true, updatedAt: new Date().toISOString() })
    .where(eq(users.email, normalised));

  logger.info({ email: normalised }, 'Email verified via OTP');
}

// ─── Email Template ───────────────────────────────────────────────────────────

function buildEmailHtml(otp: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Verify your email — Velvet Syndicate</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a,#0f0f0f);padding:32px 40px;border-bottom:1px solid #222;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;">
                Velvet Syndicate
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;color:#aaa;font-size:14px;text-transform:uppercase;letter-spacing:1px;">
                Email Verification
              </p>
              <h2 style="margin:0 0 24px;color:#fff;font-size:24px;font-weight:600;">
                Your one-time code
              </h2>
              <!-- OTP Box -->
              <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
                <span style="font-size:40px;font-weight:800;letter-spacing:10px;color:#fff;font-family:monospace;">
                  ${otp}
                </span>
              </div>
              <p style="margin:0 0 16px;color:#888;font-size:14px;line-height:1.6;">
                Enter this code to verify your email address.
                This code is valid for <strong style="color:#fff;">${OTP_EXPIRY_MINUTES} minutes</strong>
                and can only be used once.
              </p>
              <p style="margin:0;color:#555;font-size:13px;">
                If you didn't create an account with Velvet Syndicate, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #222;">
              <p style="margin:0;color:#444;font-size:12px;">
                © ${new Date().getFullYear()} Velvet Syndicate · Do not reply to this email
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
