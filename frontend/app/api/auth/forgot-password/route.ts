import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import crypto from 'node:crypto'
import { db } from '@/lib/db'
import { users, passwordResetTokens } from '@/lib/db-schema'
import { eq, and, gt } from 'drizzle-orm'
import { Resend } from 'resend'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'info@velvetsyndicate.shop'
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Artificial delay to mitigate automated spam and timing attacks
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));

    const { email } = await req.json()
    const normalisedEmail = email?.toLowerCase().trim()

    if (!normalisedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalisedEmail)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous'
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const fingerprint = crypto.createHash('md5').update(`${ip}:${userAgent}`).digest('hex')

    // 1. Dual-Bucket Rate Limiting
    // Bucket A: Per IP/Fingerprint (Prevents botnets/VPN rotations from targetting different emails)
    const ipLimit = await rateLimit(`fp:ip:${fingerprint}`, 3600, 10) // 10 per hour per device
    if (!ipLimit.success) {
      return NextResponse.json({ error: 'Too many requests from this device. Try again later.' }, { status: 429 })
    }

    // Bucket B: Per Email (Prevents single account spamming)
    const emailLimit = await rateLimit(`fp:email:${normalisedEmail}`, 60, 1) // 1 per 60s
    if (!emailLimit.success) {
      return NextResponse.json({ error: 'Reset link already sent. Please check your inbox.' }, { status: 429 })
    }

    // 2. Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, normalisedEmail),
    })

    // Security: Generic response
    const genericResponse = {
      success: true,
      message: 'If an account exists with that email, a reset link has been sent.',
    }

    if (!user) {
      return NextResponse.json(genericResponse)
    }

    // 3. Clean up existing tokens for this user (Prevents token bloat/reuse)
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id))

    // 4. Generate Secure Token (HMAC-SHA256)
    const rawToken = crypto.randomBytes(32).toString('base64url')
    const tokenHash = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'fallback-secret')
      .update(rawToken)
      .digest('hex')
    
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 mins

    await db.insert(passwordResetTokens).values({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
    })

    // 5. Send Email
    const resetLink = `${APP_URL}/reset-password?token=${rawToken}`

    await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: 'Reset your Velvet Syndicate password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 8px;">
          <h1 style="color: #ffffff; text-transform: uppercase; letter-spacing: 2px;">Password Reset</h1>
          <p style="color: #cccccc; line-height: 1.6;">You requested a password reset for your Velvet Syndicate account.</p>
          <p style="color: #cccccc; line-height: 1.6;">This link will expire in 15 minutes.</p>
          <div style="margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #ffffff; color: #000000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Reset Password</a>
          </div>
          <p style="color: #666666; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    })

    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, a reset link has been sent.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
