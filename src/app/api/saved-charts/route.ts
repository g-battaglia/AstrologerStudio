import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/security/session'
import { logger } from '@/lib/logging/server'
import { createSavedChartSchema, validateBody, formatValidationErrors } from '@/lib/validation/api'
import { checkRateLimit, rateLimitExceededResponse, rateLimitHeaders, RATE_LIMITS } from '@/lib/security/rate-limit'

/**
 * Saved Charts API
 *
 * Provides authenticated CRUD endpoints for a user's saved charts.
 *
 * Notes:
 * - Requires an authenticated session (returns 401 otherwise)
 * - Applies rate limiting (standard for reads, strict for writes)
 * - Uses Prisma as persistence layer
 */

/**
 * GET /api/saved-charts
 *
 * Returns the current user's saved charts ordered by newest first.
 *
 * Auth:
 * - Requires session cookie
 *
 * Rate limit:
 * - Standard limit (see RATE_LIMITS.standard)
 *
 * Responses:
 * - 200: array of SavedChart records
 * - 401: { error: 'Unauthorized' }
 * - 429: rateLimitExceededResponse
 * - 500: { error: 'Internal Server Error' }
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting
  const rateLimitResult = checkRateLimit(session.userId, RATE_LIMITS.standard)
  if (!rateLimitResult.success) {
    return rateLimitExceededResponse(rateLimitResult, RATE_LIMITS.standard.limit)
  }

  try {
    const savedCharts = await prisma.savedChart.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(savedCharts, {
      headers: rateLimitHeaders(rateLimitResult, RATE_LIMITS.standard.limit),
    })
  } catch (error) {
    logger.error('Error fetching saved charts:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * POST /api/saved-charts
 *
 * Creates a new saved chart for the current user.
 *
 * Validates request body via createSavedChartSchema. `chartData`, `settings`, and `tags`
 * are persisted as JSON strings to keep storage consistent.
 *
 * Auth:
 * - Requires session cookie
 *
 * Rate limit:
 * - Strict limit for write operations (see RATE_LIMITS.strict)
 *
 * Responses:
 * - 201: created SavedChart record
 * - 400: validation error details
 * - 401: { error: 'Unauthorized' }
 * - 429: rateLimitExceededResponse
 * - 500: { error: 'Internal Server Error' }
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting (stricter for write operations)
  const rateLimitResult = checkRateLimit(session.userId, RATE_LIMITS.strict)
  if (!rateLimitResult.success) {
    return rateLimitExceededResponse(rateLimitResult, RATE_LIMITS.strict.limit)
  }

  try {
    const body = await req.json()

    // Validate request body
    const validation = validateBody(body, createSavedChartSchema)
    if (!validation.success) {
      return NextResponse.json(formatValidationErrors(validation.errors), { status: 400 })
    }

    const { name, type, chartData, settings, notes, tags } = validation.data

    const savedChart = await prisma.savedChart.create({
      data: {
        userId: session.userId,
        name,
        type,
        chartData: typeof chartData === 'string' ? chartData : JSON.stringify(chartData),
        settings: settings ? (typeof settings === 'string' ? settings : JSON.stringify(settings)) : null,
        notes: notes || null,
        tags: tags ? JSON.stringify(tags) : null,
      },
    })

    logger.debug('Created saved chart:', { id: savedChart.id, userId: session.userId })

    return NextResponse.json(savedChart, {
      status: 201,
      headers: rateLimitHeaders(rateLimitResult, RATE_LIMITS.strict.limit),
    })
  } catch (error) {
    logger.error('Error creating saved chart:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
