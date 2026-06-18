import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import crypto from 'node:crypto'
import { db } from '@/lib/db'
import { vaultWaitlist } from '@/lib/db-schema'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  try {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300))

    const { email } = await req.json()
    const normalisedEmail = email?.toLowerCase().trim()

    if (!normalisedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalisedEmail)) {
      return NextResponse.json(
        { success: false, message: 'Valid email is required' },
        { status: 400 }
      )
    }

    const existing = await db.query.vaultWaitlist.findFirst({
      where: eq(vaultWaitlist.email, normalisedEmail),
    })

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'This email is already on the waitlist.' },
        { status: 409 }
      )
    }

    await db.insert(vaultWaitlist).values({
      id: crypto.randomUUID(),
      email: normalisedEmail,
    })

    return NextResponse.json({
      success: true,
      message: "You're on the list. We'll notify you when Velvet Vault unlocks.",
    })
  } catch (error) {
    console.error('Waitlist signup error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}