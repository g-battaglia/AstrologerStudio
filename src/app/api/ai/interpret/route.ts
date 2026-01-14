/**
 * @fileoverview AI Interpretation Streaming API Route
 *
 * This endpoint generates astrological chart interpretations using AI (via OpenRouter).
 * It supports multiple chart types and implements comprehensive rate limiting, caching,
 * and subscription-based usage tracking.
 *
 * @route POST /api/ai/interpret
 *
 * ## Features
 * - **Streaming responses**: Uses Vercel AI SDK for real-time text streaming
 * - **Multi-chart support**: Natal, synastry, transit, composite, solar/lunar returns
 * - **Intelligent caching**: SHA-256 hash-based cache with user scoping (prevents cross-tenant leakage)
 * - **Rate limiting**: Per-minute burst protection + daily/monthly limits
 * - **Subscription enforcement**: Free plan limits via billing integration
 *
 * ## Request Body
 * ```typescript
 * {
 *   chartData: ChartData,           // Chart calculation data (subject, aspects, points)
 *   chartType: string,              // 'natal' | 'synastry' | 'transit' | 'composite' | 'solar_return' | 'lunar_return'
 *   systemPrompt?: string,          // Custom AI system prompt (optional)
 *   chartTypePrompt: string,        // Chart-specific interpretation prompt
 *   language: string,               // Response language code
 *   include_house_comparison: boolean,
 *   relationshipType?: string       // For synastry: 'romantic' | 'friendship' | etc.
 * }
 * ```
 *
 * ## Response
 * - **200**: Streaming text response (Content-Type: text/plain)
 * - **401**: Unauthorized (no session)
 * - **402**: Payment required (daily/monthly limit reached)
 * - **429**: Rate limit exceeded
 * - **500**: Server error
 *
 * ## Architecture Flow
 * 1. Session validation → Rate limit check → Subscription limit check
 * 2. Cache lookup (if enabled) → Return cached if fresh
 * 3. Fetch AI context from Astrologer API (external service)
 * 4. Reserve usage count (pre-increment to prevent race conditions)
 * 5. Stream AI response via OpenRouter
 * 6. Cache result on completion
 *
 * @module api/ai/interpret
 */

import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/security/session'
import { astrologerApi } from '@/lib/api/astrologer'
import type { ChartData, SubjectModel } from '@/types/astrology'
import { AI_CACHE_ENABLED, AI_CACHE_TTL_MS } from '@/lib/ai/config'
import { logger } from '@/lib/logging/server'
import { aiInterpretRequestSchema, validateBody, formatValidationErrors } from '@/lib/validation/api'
import { checkRateLimit, rateLimitExceededResponse, RATE_LIMITS } from '@/lib/security/rate-limit'
import { buildAIInterpretationUserPrompt, DEFAULT_AI_SYSTEM_PROMPT } from '@/lib/ai/prompts'
import { canGenerateAI, getPlanLimits } from '@/lib/subscription/plan-limits'

/**
 * OpenRouter client configured as OpenAI-compatible provider.
 * Uses DeepSeek v3.2 model for astrological interpretations.
 *
 * @see https://openrouter.ai/docs
 */
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
})

import { omitKeys } from '@/lib/utils/object'

/**
 * Generates a SHA-256 hash from a data object.
 * Used for cache key generation to identify identical interpretation requests.
 *
 * @param data - Object to hash (will be JSON stringified)
 * @returns Hexadecimal hash string
 *
 * @example
 * ```ts
 * const hash = generateHash({ chartType: 'natal', subject: {...} })
 * // Returns: "a1b2c3d4e5f6..."
 * ```
 */
function generateHash(data: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
}

/**
 * Raw subject data structure as received from chart calculations.
 * Supports alternative field names from different API responses.
 *
 * @remarks
 * The Astrologer API may return location/timezone with different field names:
 * - `latitude` vs `lat`
 * - `longitude` vs `lng`
 * - `timezone` vs `tz_str`
 */
interface RawSubjectData {
  /** Subject's display name */
  name?: string
  /** Birth year */
  year?: number
  /** Birth month (1-12) */
  month?: number
  /** Birth day (1-31) */
  day?: number
  /** Birth hour (0-23) */
  hour?: number
  /** Birth minute (0-59) */
  minute?: number
  /** Birth second (0-59, defaults to 0) */
  second?: number
  /** Birth city name */
  city?: string
  /** Birth country/nation */
  nation?: string
  /** Latitude (decimal degrees) */
  latitude?: number
  /** Alternative latitude field name */
  lat?: number
  /** Longitude (decimal degrees) */
  longitude?: number
  /** Alternative longitude field name */
  lng?: number
  /** IANA timezone string (e.g., "Europe/Rome") */
  timezone?: string
  /** Alternative timezone field name */
  tz_str?: string
  /** Zodiac system: "Tropical" | "Sidereal" */
  zodiac_type?: string
  /** Sidereal ayanamsa (if zodiac_type is Sidereal) */
  sidereal_mode?: string
  /** House system code (e.g., "P" for Placidus) */
  houses_system_identifier?: string
  /** Perspective: "Apparent Geocentric" | "Heliocentric" */
  perspective_type?: string
  /** Pre-calculated UTC datetime in ISO format */
  iso_formatted_utc_datetime?: string
}

/**
 * Normalizes and validates raw subject data for API consumption.
 *
 * Handles field name variations from different sources and ensures
 * all required fields are present before making API calls.
 *
 * @param subject - Raw subject data with potential alternative field names
 * @returns Normalized SubjectModel or null if validation fails
 *
 * @example
 * ```ts
 * const subject = normalizeSubject({
 *   name: "John",
 *   year: 1990, month: 5, day: 15,
 *   hour: 14, minute: 30,
 *   city: "Rome", nation: "IT",
 *   lat: 41.9, lng: 12.5, tz_str: "Europe/Rome"
 * })
 * // Returns normalized SubjectModel with latitude, longitude, timezone
 * ```
 */
function normalizeSubject(subject: RawSubjectData | undefined): SubjectModel | null {
  if (!subject) return null

  // Extract fields with fallbacks for alternative names
  const latitude = subject.latitude ?? subject.lat
  const longitude = subject.longitude ?? subject.lng
  const timezone = subject.timezone ?? subject.tz_str

  // Validate required fields
  if (!subject.name || !subject.city || !subject.nation) {
    return null
  }
  if (subject.year === undefined || subject.month === undefined || subject.day === undefined) {
    return null
  }
  if (subject.hour === undefined || subject.minute === undefined) {
    return null
  }

  return {
    name: subject.name,
    year: subject.year,
    month: subject.month,
    day: subject.day,
    hour: subject.hour,
    minute: subject.minute,
    second: subject.second ?? 0,
    city: subject.city,
    nation: subject.nation,
    latitude,
    longitude,
    timezone,
    zodiac_type: subject.zodiac_type,
    sidereal_mode: subject.sidereal_mode,
    houses_system_identifier: subject.houses_system_identifier,
    perspective_type: subject.perspective_type,
  }
}

/**
 * Fetches astrological context data from the Astrologer API.
 *
 * Routes to the appropriate API endpoint based on chart type and returns
 * structured context text for AI interpretation.
 *
 * @param chartData - Complete chart calculation data
 * @param chartType - Type of chart interpretation requested
 * @param includeHouseComparison - Whether to include house overlay analysis (synastry/transit)
 * @returns Context string containing astrological analysis data
 *
 * @throws {Error} If required subjects are missing or API call fails
 *
 * @remarks
 * For transit charts, certain fields are omitted from the transit subject
 * (zodiac_type, sidereal_mode, etc.) as these should inherit from the natal chart.
 *
 * @example
 * ```ts
 * const context = await fetchAIContext(chartData, 'natal', false)
 * // Returns: "Sun in Aries in 1st house... Moon in Cancer..."
 * ```
 */
async function fetchAIContext(
  chartData: ChartData,
  chartType: string,
  includeHouseComparison: boolean,
): Promise<string> {
  const { subject, first_subject, second_subject, active_points, active_aspects } = chartData

  try {
    switch (chartType) {
      case 'natal': {
        const normalizedSubject = normalizeSubject(subject as RawSubjectData)
        if (!normalizedSubject) {
          throw new Error('Natal chart requires a valid subject with all required fields')
        }
        const response = await astrologerApi.getNatalContext(normalizedSubject, {
          active_points,
          active_aspects,
        })
        return response.context
      }

      case 'synastry': {
        const subjectA = normalizeSubject(first_subject as RawSubjectData)
        const subjectB = normalizeSubject(second_subject as RawSubjectData)
        if (!subjectA || !subjectB) {
          throw new Error('Synastry chart requires both subjects with all required fields')
        }
        const response = await astrologerApi.getSynastryContext(subjectA, subjectB, {
          active_points,
          active_aspects,
          include_house_comparison: includeHouseComparison,
        })
        return response.context
      }

      case 'transit': {
        const natalSubject = normalizeSubject(first_subject as RawSubjectData)
        const transitSubject = normalizeSubject(second_subject as RawSubjectData)
        if (!natalSubject || !transitSubject) {
          throw new Error('Transit chart requires both subjects with all required fields')
        }
        const sanitizedTransitSubject = omitKeys(transitSubject, [
          'zodiac_type',
          'sidereal_mode',
          'perspective_type',
          'houses_system_identifier',
        ] as const)

        const response = await astrologerApi.getTransitContext(natalSubject, sanitizedTransitSubject, {
          active_points,
          active_aspects,
          include_house_comparison: includeHouseComparison,
        })
        return response.context
      }

      case 'composite': {
        const subjectA = normalizeSubject(first_subject as RawSubjectData)
        const subjectB = normalizeSubject(second_subject as RawSubjectData)
        if (!subjectA || !subjectB) {
          throw new Error('Composite chart requires both subjects with all required fields')
        }
        const response = await astrologerApi.getCompositeContext(subjectA, subjectB, {
          active_points,
          active_aspects,
        })
        return response.context
      }

      case 'solar_return': {
        // For dual wheel return charts, subject may be undefined - use first_subject instead
        const rawReturnSubject = (subject || first_subject) as RawSubjectData
        const normalizedSubject = normalizeSubject(rawReturnSubject)
        if (!normalizedSubject) {
          throw new Error('Solar return chart requires a valid subject')
        }
        // Extract return date from second_subject (the return chart data)
        const returnIsoDatetime = (second_subject as RawSubjectData)?.iso_formatted_utc_datetime
        const response = await astrologerApi.getSolarReturnContext(normalizedSubject, {
          active_points,
          active_aspects,
          iso_datetime: returnIsoDatetime,
        })
        return response.context
      }

      case 'lunar_return': {
        // For dual wheel return charts, subject may be undefined - use first_subject instead
        const rawReturnSubject = (subject || first_subject) as RawSubjectData
        const normalizedSubject = normalizeSubject(rawReturnSubject)
        if (!normalizedSubject) {
          throw new Error('Lunar return chart requires a valid subject')
        }
        // Extract return date from second_subject (the return chart data)
        const returnIsoDatetime = (second_subject as RawSubjectData)?.iso_formatted_utc_datetime
        const response = await astrologerApi.getLunarReturnContext(normalizedSubject, {
          active_points,
          active_aspects,
          iso_datetime: returnIsoDatetime,
        })
        return response.context
      }

      default:
        throw new Error(`Unsupported chart type: ${chartType}`)
    }
  } catch (error) {
    logger.error('Error fetching AI context:', error)
    throw new Error(`Failed to fetch AI context: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * POST /api/ai/interpret
 *
 * Generates streaming AI interpretations for astrological charts.
 *
 * ## Authentication
 * Requires valid session with userId.
 *
 * ## Rate Limiting
 * - Per-minute burst limit (prevents abuse)
 * - Daily limit based on subscription plan (free: 5, pro: 20)
 *
 * ## Caching Strategy
 * Interpretations are cached using SHA-256 hash of request parameters.
 * Cache is user-scoped to prevent information leakage between tenants.
 * Cache TTL is configurable via AI_CACHE_TTL_MS.
 *
 * ## Usage Reservation Pattern
 * To prevent race conditions where multiple requests could exceed limits,
 * usage is incremented BEFORE generation starts. If the limit check fails
 * post-increment, the count is rolled back.
 *
 * @param request - Next.js request object containing chart data
 * @returns Streaming text response or JSON error
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting (per-minute burst protection)
    const rateLimitResult = checkRateLimit(session.userId, RATE_LIMITS.ai)
    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult, RATE_LIMITS.ai.limit)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUBSCRIPTION LIMIT CHECKS (Dodo Payments Integration)
    // ─────────────────────────────────────────────────────────────────────────

    // Step 1: Fetch user's subscription plan
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { subscriptionPlan: true, aiGenerationsTotal: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Step 2: Get plan-specific limits
    const limits = getPlanLimits(user.subscriptionPlan)

    // Step 3: Get current date for daily tracking
    const today = new Date().toISOString().split('T')[0]!

    // Daily limit check is performed POST-INCREMENT to prevent race conditions.
    // See "USAGE RESERVATION" section below.

    const body = await request.json()

    // Validate request body
    const validation = validateBody(body, aiInterpretRequestSchema)
    if (!validation.success) {
      return NextResponse.json(formatValidationErrors(validation.errors), { status: 400 })
    }

    const {
      chartData,
      chartType,
      systemPrompt,
      chartTypePrompt,
      language,
      include_house_comparison,
      relationshipType,
    } = validation.data

    if (!process.env.OPENROUTER_API_KEY) {
      logger.error('OpenRouter API key not configured')
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CACHE LOOKUP
    // ─────────────────────────────────────────────────────────────────────────

    // Generate cache key including userId to prevent cross-tenant leakage
    const cacheKey = {
      userId: session.userId,
      chartData,
      chartType,
      systemPrompt,
      chartTypePrompt,
      language,
      include_house_comparison,
      relationshipType,
    }
    const hash = generateHash(cacheKey)

    // Check cache if enabled
    if (AI_CACHE_ENABLED) {
      const cachedInterpretation = await prisma.cachedInterpretation.findUnique({
        where: {
          hash_userId: {
            hash,
            userId: session.userId,
          },
        },
      })

      if (cachedInterpretation) {
        const ageMs = Date.now() - cachedInterpretation.createdAt.getTime()
        if (ageMs <= AI_CACHE_TTL_MS) {
          logger.debug(`[CACHE HIT] Hash: ${hash.substring(0, 8)}...`)
          return new Response(cachedInterpretation.content, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        } else {
          logger.debug(`[CACHE STALE] Hash: ${hash.substring(0, 8)}...`)
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FETCH AI CONTEXT FROM ASTROLOGER API
    // ─────────────────────────────────────────────────────────────────────────

    logger.debug(`[AI] Generating interpretation for ${chartType}`)

    // Extract subject names for prompt context
    const subjectNames: string[] = []

    // Safety cast since validation.data.chartData is Record<string, unknown>
    const safeChartData = chartData as unknown as ChartData

    if (['synastry', 'composite'].includes(chartType)) {
      const name1 = safeChartData.first_subject?.name || safeChartData.subject?.name
      const name2 = safeChartData.second_subject?.name
      if (name1) subjectNames.push(name1)
      if (name2) subjectNames.push(name2)
    } else if (['solar_return', 'lunar_return'].includes(chartType)) {
      const name = safeChartData.first_subject?.name || safeChartData.subject?.name
      if (name) subjectNames.push(name)
    } else if (safeChartData.subject?.name) {
      subjectNames.push(safeChartData.subject.name)
    }

    const aiContext = await fetchAIContext(safeChartData, chartType, include_house_comparison)

    const userPrompt = buildAIInterpretationUserPrompt({
      chartTypePrompt,
      aiContext,
      language,
      relationshipType,
      subjectNames,
    })

    // ─────────────────────────────────────────────────────────────────────────
    // USAGE RESERVATION (Atomic Pre-increment Pattern)
    // ─────────────────────────────────────────────────────────────────────────
    // To prevent race conditions, we increment FIRST then check the limit.
    // If exceeded, we rollback.

    const updatedUsage = await prisma.userAIUsage.upsert({
      where: {
        userId_date: {
          userId: session.userId,
          date: today,
        },
      },
      update: { count: { increment: 1 } },
      create: { userId: session.userId, date: today, count: 1 },
    })

    // Check daily limit (free: 5/day, pro: 20/day)
    // canGenerateAI checks if (count - 1) < maxAIGenerations
    if (!canGenerateAI(user.subscriptionPlan, updatedUsage.count - 1)) {
      // Rollback the increment
      await prisma.userAIUsage.update({
        where: { id: updatedUsage.id },
        data: { count: { decrement: 1 } },
      })
      return NextResponse.json(
        {
          error: 'Daily AI limit reached',
          message: `You have reached your daily limit of ${limits.maxAIGenerations} AI interpretations.`,
          upgradeUrl: '/pricing',
          resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
        },
        { status: 402 },
      )
    }

    // All checks passed - update lifetime counter for analytics
    await prisma.user.update({
      where: { id: session.userId },
      data: { aiGenerationsTotal: { increment: 1 } },
    })

    // ─────────────────────────────────────────────────────────────────────────
    // STREAM AI RESPONSE
    // ─────────────────────────────────────────────────────────────────────────

    // Determine system prompt to use
    // If custom prompts are disabled, always use default regardless of client request
    const customPromptsEnabled = process.env.NEXT_PUBLIC_ENABLE_CUSTOM_AI_PROMPTS === 'true'
    const effectiveSystemPrompt = customPromptsEnabled && systemPrompt ? systemPrompt : DEFAULT_AI_SYSTEM_PROMPT

    const result = streamText({
      model: openrouter('deepseek/deepseek-v3.2'),
      system: effectiveSystemPrompt,
      prompt: userPrompt,

      /**
       * Callback executed when streaming completes.
       * Saves the generated interpretation to cache for future requests.
       */
      onFinish: async ({ text }) => {
        try {
          // Save to cache if enabled and response is substantial (>50 chars)
          if (AI_CACHE_ENABLED && text && text.length > 50) {
            await prisma.cachedInterpretation.upsert({
              where: {
                hash_userId: {
                  hash,
                  userId: session.userId,
                },
              },
              update: { content: text },
              create: { hash, userId: session.userId, content: text },
            })
            logger.debug(`[CACHE] Saved interpretation`)
          }
        } catch (error) {
          logger.error('Error saving to cache:', error)
        }
      },
    })

    // Create streaming response with debug headers
    const streamResponse = result.toTextStreamResponse()
    
    // Add debug headers with base64-encoded context (to handle newlines)
    // These headers allow the frontend to display what was sent to the AI
    const headers = new Headers(streamResponse.headers)
    headers.set('X-AI-Context', Buffer.from(aiContext).toString('base64'))
    headers.set('X-AI-User-Prompt', Buffer.from(userPrompt).toString('base64'))
    
    return new Response(streamResponse.body, {
      status: streamResponse.status,
      statusText: streamResponse.statusText,
      headers,
    })
  } catch (error) {
    logger.error('Error generating interpretation:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
