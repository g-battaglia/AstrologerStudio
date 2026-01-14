import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/security/session'
import { logger } from '@/lib/logging/server'
import { updateSavedChartSchema, validateBody, formatValidationErrors } from '@/lib/validation/api'
import { checkRateLimit, rateLimitExceededResponse, rateLimitHeaders, RATE_LIMITS } from '@/lib/security/rate-limit'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting
  const rateLimitResult = checkRateLimit(session.userId, RATE_LIMITS.strict)
  if (!rateLimitResult.success) {
    return rateLimitExceededResponse(rateLimitResult, RATE_LIMITS.strict.limit)
  }

  const { id } = await params

  try {
    const body = await req.json()

    // Validate request body
    const validation = validateBody(body, updateSavedChartSchema)
    if (!validation.success) {
      return NextResponse.json(formatValidationErrors(validation.errors), { status: 400 })
    }

    const { name, notes, chartData, settings, tags } = validation.data

    // Verify ownership with single query
    const savedChart = await prisma.savedChart.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!savedChart) {
      return NextResponse.json({ error: 'Chart not found' }, { status: 404 })
    }

    if (savedChart.userId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build update data only with provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (name !== undefined) {
      updateData.name = name
    }
    if (notes !== undefined) {
      updateData.notes = notes
    }
    if (chartData !== undefined) {
      updateData.chartData = typeof chartData === 'string' ? chartData : JSON.stringify(chartData)
    }
    if (settings !== undefined) {
      updateData.settings = typeof settings === 'string' ? settings : JSON.stringify(settings)
    }
    if (tags !== undefined) {
      updateData.tags = tags ? JSON.stringify(tags) : null
    }

    const updatedChart = await prisma.savedChart.update({
      where: { id },
      data: updateData,
    })

    logger.debug('Updated saved chart:', { id, userId: session.userId })

    return NextResponse.json(updatedChart, {
      headers: rateLimitHeaders(rateLimitResult, RATE_LIMITS.strict.limit),
    })
  } catch (error) {
    logger.error('Error updating saved chart:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting
  const rateLimitResult = checkRateLimit(session.userId, RATE_LIMITS.strict)
  if (!rateLimitResult.success) {
    return rateLimitExceededResponse(rateLimitResult, RATE_LIMITS.strict.limit)
  }

  const { id } = await params

  try {
    // Use deleteMany with conditions to verify ownership and delete in one query
    const result = await prisma.savedChart.deleteMany({
      where: {
        id,
        userId: session.userId,
      },
    })

    if (result.count === 0) {
      return NextResponse.json({ error: 'Chart not found or unauthorized' }, { status: 404 })
    }

    logger.debug('Deleted saved chart:', { id, userId: session.userId })

    return NextResponse.json(
      { success: true },
      { headers: rateLimitHeaders(rateLimitResult, RATE_LIMITS.strict.limit) },
    )
  } catch (error) {
    logger.error('Error deleting saved chart:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
