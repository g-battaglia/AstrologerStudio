'use server'

import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/security/session'

/**
 * PDF Export Tracking Server Actions
 * Track PDF exports per user for analytics and admin dashboard
 */

type ActionResult = { success: true } | { success: false; error: string }

export type PDFChartType = 'natal' | 'synastry' | 'transit' | 'composite' | 'solar-return' | 'lunar-return'

/**
 * Track a PDF export for the current user
 * Called after a successful PDF download
 */
export async function trackPdfExport(chartType: PDFChartType): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session?.userId) {
      // Silently fail for unauthenticated users (shouldn't happen but be safe)
      return { success: true }
    }

    const today = new Date().toISOString().split('T')[0]!

    // Upsert the usage record (increment if exists, create if not)
    await prisma.pDFExportUsage.upsert({
      where: {
        userId_date_chartType: {
          userId: session.userId,
          date: today,
          chartType,
        },
      },
      update: {
        count: { increment: 1 },
      },
      create: {
        userId: session.userId,
        date: today,
        chartType,
        count: 1,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to track PDF export:', error)
    // Don't fail the user's export just because tracking failed
    return { success: true }
  }
}

/**
 * Get total PDF exports for a user (used in admin)
 */
export async function getUserPdfExportsTotal(userId: string): Promise<number> {
  const result = await prisma.pDFExportUsage.aggregate({
    where: { userId },
    _sum: { count: true },
  })
  return result._sum.count || 0
}
