/**
 * Global Prisma Client for Next.js App Runtime
 *
 * This module provides a singleton PrismaClient instance for use throughout
 * the Next.js application. It uses the PostgreSQL adapter and implements
 * the singleton pattern to prevent connection leaks during development.
 *
 * @remarks
 * - Uses singleton pattern to prevent multiple instances in development
 * - In production, creates a new instance for each deployment
 * - Hot reloading in dev doesn't create new connections
 * - Uses `@prisma/adapter-pg` for PostgreSQL (Prisma 7+)
 *
 * @example
 * ```ts
 * import { prisma } from '@/lib/db/prisma'
 *
 * // In a Server Action or API route
 * const users = await prisma.user.findMany()
 * ```
 *
 * @module lib/prisma
 */
import { Pool } from 'pg'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Global reference to store the Prisma instance across hot reloads.
 * This prevents creating new connections on every file change during development.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Creates a new PrismaClient instance with PostgreSQL adapter.
 *
 * @returns Configured PrismaClient with logging based on environment
 *
 * @remarks
 * - In development: logs queries, errors, and warnings for debugging
 * - In production: only logs errors to reduce noise
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL

  const pool = new Pool({
    connectionString,
  })

  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

/**
 * The global Prisma Client instance.
 *
 * Uses an existing instance from the global scope in development,
 * or creates a new one in production.
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// In development, store the instance globally to reuse across hot reloads
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
