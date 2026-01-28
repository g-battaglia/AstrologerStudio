import type {
  SubjectModel,
  ChartResponse,
  ChartRequestOptions,
  EnrichedSubjectModel,
  PlanetaryReturnRequestOptions,
  SingleChartData,
  DualChartData,
  ContextChartData,
} from '@/types/astrology'
import { logger } from '@/lib/logging/server'

const BASE_URL = process.env.ASTROLOGER_API_URL
const DEFAULT_TIMEOUT = 15000 // 10 seconds

// Configurable API headers (defaults to RapidAPI format)
const ASTROLOGER_API_HOST = process.env.ASTROLOGER_API_HOST || 'astrologer.p.rapidapi.com'
const ASTROLOGER_API_HOST_HEADER = process.env.ASTROLOGER_API_HOST_HEADER || 'X-RapidAPI-Host'
const ASTROLOGER_API_KEY_HEADER = process.env.ASTROLOGER_API_KEY_HEADER || 'X-RapidAPI-Key'
const ASTROLOGER_API_KEY = process.env.ASTROLOGER_API_KEY || ''

logger.info(`[AstrologerAPI] Configured API URL: ${BASE_URL || 'Default (RapidAPI)'}`)

/**
 * Client for interacting with the Astrologer API
 * Handles natal, transit, synastry, and now charts
 *
 * @example
 * ```ts
 * const client = new AstrologerApiClient(apiKey)
 * const chart = await client.getNatalChart(subject, { theme: 'dark' })
 * ```
 */
export class AstrologerApiClient {
  private apiKey: string

  /**
   * @param apiKey - RapidAPI key for authentication
   * @throws Error if apiKey is empty
   */
  constructor(apiKey: string) {
    if (!apiKey) {
      logger.warn('AstrologerApiClient initialized without API key!')
    }
    this.apiKey = apiKey
  }

  /**
   * Internal request handler with timeout and error handling
   *
   * @param endpoint - API endpoint path
   * @param method - HTTP method
   * @param body - Request body (optional)
   * @returns Parsed JSON response
   * @throws Error with detailed message on failure
   */
  private async request<T>(endpoint: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Include API auth headers only when configured
    if (ASTROLOGER_API_HOST) {
      headers[ASTROLOGER_API_HOST_HEADER] = ASTROLOGER_API_HOST
    }
    if (this.apiKey) {
      headers[ASTROLOGER_API_KEY_HEADER] = this.apiKey
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)

    // Debug log request details
    logger.debug(`[AstrologerAPI] ${method} ${BASE_URL}${endpoint}`)
    if (body) {
      logger.debug('[AstrologerAPI] Request body:', JSON.stringify(body, null, 2))
    }

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        logger.debug(`[AstrologerAPI] Error response: ${errorText}`)
        const errorMessage = `API Error ${response.status}: ${errorText}`
        logger.error(`[AstrologerAPI] ${errorMessage}`)
        throw new Error(errorMessage)
      }

      const jsonResponse = await response.json()
      logger.debug(`[AstrologerAPI] Response status: OK, chart_type: ${jsonResponse.chart_data?.chart_type}`)
      // logger.debug(`[AstrologerAPI] Response data: ${JSON.stringify(jsonResponse, null, 2)}`)
      return jsonResponse
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          const timeoutError = `Request timeout after ${DEFAULT_TIMEOUT}ms`
          logger.error(`[AstrologerAPI] ${timeoutError}`)
          throw new Error(timeoutError)
        }
        // Log connection errors and other fetch failures
        if (!error.message.startsWith('API Error')) {
          logger.error(`[AstrologerAPI] Request failed: ${error.message}`, { endpoint, method })
        }
        throw error
      }
      const unknownError = 'Unknown error occurred during API request'
      logger.error(`[AstrologerAPI] ${unknownError}`)
      throw new Error(unknownError)
    }
  }

  /**
   * Get astrological subject data (planets, houses) without chart rendering
   *
   * @param subject - Birth data
   * @param options - Optional calculation options (active_points, etc.)
   * @returns Subject with calculated planetary positions and houses
   *
   * @example
   * ```ts
   * const data = await api.getSubject({
   *   name: 'John',
   *   year: 1990,
   *   month: 6,
   *   day: 15,
   *   hour: 12,
   *   minute: 0,
   *   second: 0,
   *   city: 'London',
   *   nation: 'GB',
   *   timezone: 'Europe/London',
   *   longitude: -0.1278,
   *   latitude: 51.5074,
   * }, { active_points: ['Sun', 'Moon', 'Chiron'] })
   * ```
   */
  async getSubject(
    subject: SubjectModel,
    options?: Pick<ChartRequestOptions, 'active_points'>,
  ): Promise<{ status: string; subject: EnrichedSubjectModel }> {
    return this.request<{ status: string; subject: EnrichedSubjectModel }>('/subject', 'POST', {
      subject,
      ...options,
    })
  }

  /**
   * Generate a natal (birth) chart
   *
   * @param subject - Birth data for the subject
   * @param options - Chart rendering and calculation options
   * @returns Chart response with SVG and data
   */
  async getNatalChart(subject: SubjectModel, options?: ChartRequestOptions): Promise<ChartResponse> {
    return this.request<ChartResponse>('/chart/birth-chart', 'POST', {
      subject,
      ...options,
    })
  }

  /**
   * Generate a transit chart (natal + current planetary positions)
   *
   * @param natalSubject - Birth data for the natal chart
   * @param transitSubject - Birth data representing transit moment
   * @param options - Chart rendering options
   * @returns Chart response with both subjects' data
   */
  async getTransitChart(
    natalSubject: SubjectModel,
    transitSubject: SubjectModel,
    options?: ChartRequestOptions,
  ): Promise<ChartResponse> {
    return this.request<ChartResponse>('/chart/transit', 'POST', {
      first_subject: natalSubject,
      transit_subject: transitSubject,
      include_house_comparison: true,
      ...options,
    })
  }

  /**
   * Get transit chart data without rendering (lighter request)
   */
  async getTransitChartData(
    natalSubject: SubjectModel,
    transitSubject: SubjectModel,
    options?: Pick<
      ChartRequestOptions,
      'active_points' | 'active_aspects' | 'distribution_method' | 'custom_distribution_weights'
    >,
  ): Promise<ChartResponse> {
    return this.request<ChartResponse>('/chart-data/transit', 'POST', {
      first_subject: natalSubject,
      transit_subject: transitSubject,
      include_house_comparison: true,
      ...options,
    })
  }

  /**
   * Generate a synastry chart (relationship compatibility)
   *
   * @param subjectA - Birth data for first person
   * @param subjectB - Birth data for second person
   * @param options - Chart rendering options
   * @returns Chart response with relationship score
   */
  async getSynastryChart(
    subjectA: SubjectModel,
    subjectB: SubjectModel,
    options?: ChartRequestOptions,
  ): Promise<ChartResponse> {
    return this.request<ChartResponse>('/chart/synastry', 'POST', {
      first_subject: subjectA,
      second_subject: subjectB,
      include_house_comparison: true,
      include_relationship_score: true,
      ...options,
    })
  }

  /**
   * Generate a composite chart (midpoint chart)
   *
   * @param subjectA - Birth data for first person
   * @param subjectB - Birth data for second person
   * @param options - Chart rendering options
   * @returns Chart response with composite data
   */
  async getCompositeChart(
    subjectA: SubjectModel,
    subjectB: SubjectModel,
    options?: ChartRequestOptions,
  ): Promise<ChartResponse> {
    return this.request<ChartResponse>('/chart/composite', 'POST', {
      first_subject: subjectA,
      second_subject: subjectB,
      ...options,
    })
  }

  /**
   * Generate a "now" chart for current moment
   *
   * @param options - Chart rendering options
   * @returns Chart response for current planetary positions
   */
  async getNowChart(options?: ChartRequestOptions): Promise<ChartResponse> {
    return this.request<ChartResponse>('/now/chart', 'POST', {
      ...options,
    })
  }

  /**
   * Generate a solar return chart
   *
   * @param subject - Natal subject data
   * @param options - Return chart specific options
   * @returns Chart response with solar return data
   */
  async getSolarReturnChart(subject: SubjectModel, options?: PlanetaryReturnRequestOptions): Promise<ChartResponse> {
    return this.request<ChartResponse>('/chart/solar-return', 'POST', {
      subject,
      include_house_comparison: true,
      ...options,
    })
  }

  /**
   * Generate a lunar return chart
   *
   * @param subject - Natal subject data
   * @param options - Return chart specific options
   * @returns Chart response with lunar return data
   */
  async getLunarReturnChart(subject: SubjectModel, options?: PlanetaryReturnRequestOptions): Promise<ChartResponse> {
    return this.request<ChartResponse>('/chart/lunar-return', 'POST', {
      subject,
      include_house_comparison: true,
      ...options,
    })
  }

  // ========== AI Context Endpoints ==========

  /**
   * Get AI-optimized context string for a subject
   *
   * @param subject - Birth data
   * @returns Subject context string suitable for LLM prompts
   */
  async getSubjectContext(
    subject: SubjectModel,
  ): Promise<{ status: string; subject_context: string; subject: EnrichedSubjectModel }> {
    return this.request<{ status: string; subject_context: string; subject: EnrichedSubjectModel }>(
      '/context/subject',
      'POST',
      {
        subject,
      },
    )
  }

  /**
   * Get AI-optimized context string for a natal chart
   *
   * @param subject - Birth data for the subject
   * @param options - Chart calculation options (no rendering params)
   * @returns Natal chart context string and data
   */
  async getNatalContext(
    subject: SubjectModel,
    options?: Pick<
      ChartRequestOptions,
      'active_points' | 'active_aspects' | 'distribution_method' | 'custom_distribution_weights'
    >,
  ): Promise<{ status: string; context: string; chart_data: SingleChartData }> {
    return this.request<{ status: string; context: string; chart_data: SingleChartData }>(
      '/context/birth-chart',
      'POST',
      {
        subject,
        ...options,
      },
    )
  }

  /**
   * Get AI-optimized context string for a synastry chart
   *
   * @param subjectA - Birth data for first person
   * @param subjectB - Birth data for second person
   * @param options - Chart calculation options (no rendering params)
   * @returns Synastry chart context string and data
   */
  async getSynastryContext(
    subjectA: SubjectModel,
    subjectB: SubjectModel,
    options?: Omit<
      ChartRequestOptions,
      | 'theme'
      | 'language'
      | 'split_chart'
      | 'transparent_background'
      | 'show_house_position_comparison'
      | 'show_cusp_position_comparison'
      | 'show_degree_indicators'
      | 'custom_title'
      | 'include_relationship_score'
    >,
  ): Promise<{ status: string; context: string; chart_data: DualChartData }> {
    return this.request<{ status: string; context: string; chart_data: DualChartData }>('/context/synastry', 'POST', {
      first_subject: subjectA,
      second_subject: subjectB,
      include_house_comparison: true,
      include_relationship_score: true,
      ...options,
    })
  }

  /**
   * Get AI-optimized context string for a transit chart
   *
   * @param natalSubject - Birth data for the natal chart
   * @param transitSubject - Birth data representing transit moment
   * @param options - Chart calculation options (no rendering params)
   * @returns Transit chart context string and data
   */
  async getTransitContext(
    natalSubject: SubjectModel,
    transitSubject: SubjectModel,
    options?: Omit<
      ChartRequestOptions,
      | 'theme'
      | 'language'
      | 'split_chart'
      | 'transparent_background'
      | 'show_house_position_comparison'
      | 'show_cusp_position_comparison'
      | 'show_degree_indicators'
      | 'custom_title'
    >,
  ): Promise<{ status: string; context: string; chart_data: DualChartData }> {
    return this.request<{ status: string; context: string; chart_data: DualChartData }>('/context/transit', 'POST', {
      first_subject: natalSubject,
      transit_subject: transitSubject,
      include_house_comparison: true,
      ...options,
    })
  }

  /**
   * Get AI-optimized context string for a composite chart
   *
   * @param subjectA - Birth data for first person
   * @param subjectB - Birth data for second person
   * @param options - Chart calculation options (no rendering params)
   * @returns Composite chart context string and data
   */
  async getCompositeContext(
    subjectA: SubjectModel,
    subjectB: SubjectModel,
    options?: Omit<
      ChartRequestOptions,
      | 'theme'
      | 'language'
      | 'split_chart'
      | 'transparent_background'
      | 'show_house_position_comparison'
      | 'show_cusp_position_comparison'
      | 'show_degree_indicators'
      | 'custom_title'
    >,
  ): Promise<{ status: string; context: string; chart_data: SingleChartData }> {
    return this.request<{ status: string; context: string; chart_data: SingleChartData }>(
      '/context/composite',
      'POST',
      {
        first_subject: subjectA,
        second_subject: subjectB,
        ...options,
      },
    )
  }

  /**
   * Get AI-optimized context string for a solar return chart
   *
   * @param subject - Natal subject data
   * @param options - Return chart specific options (no rendering params)
   * @returns Solar return chart context string and data
   */
  async getSolarReturnContext(
    subject: SubjectModel,
    options?: Omit<
      PlanetaryReturnRequestOptions,
      | 'theme'
      | 'language'
      | 'split_chart'
      | 'transparent_background'
      | 'show_house_position_comparison'
      | 'show_cusp_position_comparison'
      | 'show_degree_indicators'
      | 'custom_title'
    >,
  ): Promise<{
    status: string
    context: string
    chart_data: ContextChartData
    return_type: string
    wheel_type: string
  }> {
    return this.request<{
      status: string
      context: string
      chart_data: ContextChartData
      return_type: string
      wheel_type: string
    }>('/context/solar-return', 'POST', {
      subject,
      ...options,
    })
  }

  /**
   * Get AI-optimized context string for a lunar return chart
   *
   * @param subject - Natal subject data
   * @param options - Return chart specific options (no rendering params)
   * @returns Lunar return chart context string and data
   */
  async getLunarReturnContext(
    subject: SubjectModel,
    options?: Omit<
      PlanetaryReturnRequestOptions,
      | 'theme'
      | 'language'
      | 'split_chart'
      | 'transparent_background'
      | 'show_house_position_comparison'
      | 'show_cusp_position_comparison'
      | 'show_degree_indicators'
      | 'custom_title'
    >,
  ): Promise<{
    status: string
    context: string
    chart_data: ContextChartData
    return_type: string
    wheel_type: string
  }> {
    return this.request<{
      status: string
      context: string
      chart_data: ContextChartData
      return_type: string
      wheel_type: string
    }>('/context/lunar-return', 'POST', {
      subject,
      ...options,
    })
  }
}

/**
 * Singleton instance to be used in Server Actions
 * Initialized with API key from environment variable
 *
 * @remarks
 * Ensure ASTROLOGER_API_KEY is set in environment variables
 */
export const astrologerApi = new AstrologerApiClient(ASTROLOGER_API_KEY)
