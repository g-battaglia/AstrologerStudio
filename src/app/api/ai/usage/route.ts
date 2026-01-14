import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/security/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user to check subscription status
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { subscriptionPlan: true },
    })

    const today = new Date().toISOString().split('T')[0]!

    // Determine limit based on plan
    // Default/Free limit is 5
    // Pro/Active plans use the env variable (default 20)
    const isPro = user?.subscriptionPlan === 'pro' || user?.subscriptionPlan === 'lifetime'
    const freeLimit = 5
    const proLimit = parseInt(process.env.MAX_DAILY_REGENERATIONS || '20', 10)

    const maxDailyRegenerations = isPro ? proLimit : freeLimit

    const usage = await prisma.userAIUsage.findUnique({
      where: {
        userId_date: {
          userId: session.userId,
          date: today,
        },
      },
    })

    const count = usage?.count || 0
    const remaining = Math.max(0, maxDailyRegenerations - count)

    return NextResponse.json({
      usage: count,
      limit: maxDailyRegenerations,
      remaining,
      plan: user?.subscriptionPlan, // Useful for debugging frontend
    })
  } catch (error) {
    console.error('Error fetching AI usage:', error)
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
  }
}
