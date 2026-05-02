import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { users, passwordResetTokens } from '@/lib/db-schema'
import { eq, and, gt } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || !password || password.length < 8) {
      return NextResponse.json({ error: 'Valid token and password (min 8 chars) are required' }, { status: 400 })
    }

    // Hash the incoming token using HMAC-SHA256 with the secret
    const tokenHash = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'fallback-secret')
      .update(token)
      .digest('hex')
    
    const tokenRecord = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, new Date().toISOString())
      ),
    })

    if (!tokenRecord) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, tokenRecord.userId),
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12)

    // Update user and delete token in a transaction
    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({ passwordHash, updatedAt: new Date().toISOString() })
        .where(eq(users.id, user.id))
      
      await tx.delete(passwordResetTokens)
        .where(eq(passwordResetTokens.id, tokenRecord.id))
    })

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully.',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
