import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/security/session'
import { logger } from '@/lib/logging/server'
import { checkRateLimit, rateLimitExceededResponse, rateLimitHeaders, RATE_LIMITS } from '@/lib/security/rate-limit'
import { z } from 'zod'
import { validateBody, formatValidationErrors } from '@/lib/validation/api'

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting (stricter for bulk operations)
  const rateLimitResult = checkRateLimit(session.userId, RATE_LIMITS.strict)
  if (!rateLimitResult.success) {
    return rateLimitExceededResponse(rateLimitResult, RATE_LIMITS.strict.limit)
  }

  try {
    const body = await req.json()

    const validation = validateBody(body, bulkDeleteSchema)
    if (!validation.success) {
      return NextResponse.json(formatValidationErrors(validation.errors), { status: 400 })
    }

    const { ids } = validation.data

    // Delete all charts that belong to the user
    const result = await prisma.savedChart.deleteMany({
      where: {
        id: { in: ids },
        userId: session.userId,
      },
    })

    logger.debug('Bulk deleted saved charts:', {
      count: result.count,
      requestedCount: ids.length,
      userId: session.userId,
    })

    return NextResponse.json(
      {
        success: true,
        deleted: result.count,
        requested: ids.length,
      },
      { headers: rateLimitHeaders(rateLimitResult, RATE_LIMITS.strict.limit) },
    )
  } catch (error) {
    logger.error('Error bulk deleting saved charts:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
