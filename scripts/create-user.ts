#!/usr/bin/env bun
/* eslint-disable no-console */
/**
 * Create User Script
 * 
 * Creates a regular user account for self-hosted deployments.
 * 
 * Usage:
 *   bun run scripts/create-user.ts --username <name> --password <pass> [options]
 * 
 * Options:
 *   --username   Required. The account username
 *   --password   Required. The account password (min 8 characters)
 *   --email      Optional. Account email address
 *   --plan       Optional. Subscription plan: free, trial, pro, lifetime (default: trial)
 * 
 * Examples:
 *   bun run scripts/create-user.ts --username john --password "Pass1234!"
 *   bun run scripts/create-user.ts --username jane --password "Pass1234!" --plan lifetime
 */

import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// ============================================================================
// Inline Utilities (self-contained script)
// ============================================================================

/**
 * Loads a `.env`-style file into `process.env` (only for missing keys).
 */
function loadEnvFileIfPresent(filePath: string): void {
  if (!fs.existsSync(filePath)) return

  const contents = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const equalsIndex = line.indexOf('=')
    if (equalsIndex === -1) continue

    const key = line.slice(0, equalsIndex).trim()
    if (!key || process.env[key] !== undefined) continue

    let value = line.slice(equalsIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}

/**
 * Loads default local env files from the current working directory.
 */
function loadDotEnvDefaults(cwd: string = process.cwd()): void {
  loadEnvFileIfPresent(path.join(cwd, '.env'))
}

/**
 * Creates a new PrismaClient instance with PostgreSQL adapter.
 */
async function createPrismaClient(): Promise<PrismaClient> {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  })

  return new PrismaClient({
    adapter,
  })
}

// Load environment variables before Prisma initialization
loadDotEnvDefaults()

interface ParsedArgs {
  username: string
  password: string
  email?: string
  plan: string
  ifExists: 'error' | 'skip'
}

function printUsage(): void {
  console.log(`
👤 Create User Script
=====================

Usage:
  bun run public-repo/create-user.ts --username <name> --password <pass> [options]

Options:
  --username    Required. The account username
  --password    Required. The account password (min 8 characters)
  --email       Optional. Account email address
  --plan        Optional. Subscription plan (default: trial)
                Valid plans: free, trial, pro, lifetime
  --if-exists   Optional. Behavior when user exists: error (default), skip

Examples:
  bun run public-repo/create-user.ts --username john --password "Pass1234!"
  bun run public-repo/create-user.ts --username jane --password "Pass1234!" --email jane@example.com
  bun run public-repo/create-user.ts --username vip --password "Pass1234!" --plan lifetime
  bun run public-repo/create-user.ts --username user --password "Pass1234!" --if-exists skip
`)
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printUsage()
    process.exit(0)
  }

  const parsed: Record<string, string> = {}
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '')
    const value = args[i + 1]
    if (key && value) {
      parsed[key] = value
    }
  }

  if (!parsed.username) {
    console.error('❌ Error: --username is required')
    process.exit(1)
  }

  if (!parsed.password) {
    console.error('❌ Error: --password is required')
    process.exit(1)
  }

  if (parsed.password.length < 8) {
    console.error('❌ Error: Password must be at least 8 characters')
    process.exit(1)
  }

  const validPlans = ['free', 'trial', 'pro', 'lifetime']
  const plan = parsed.plan || 'trial'
  if (!validPlans.includes(plan)) {
    console.error(`❌ Error: Invalid plan "${plan}". Valid plans: ${validPlans.join(', ')}`)
    process.exit(1)
  }

  const validIfExists = ['error', 'skip']
  const ifExists = (parsed['if-exists'] || 'error') as 'error' | 'skip'
  if (!validIfExists.includes(ifExists)) {
    console.error(`❌ Error: Invalid --if-exists value "${ifExists}". Valid values: ${validIfExists.join(', ')}`)
    process.exit(1)
  }

  return {
    username: parsed.username,
    password: parsed.password,
    email: parsed.email,
    plan,
    ifExists,
  }
}

async function main() {
  console.log('👤 Create User Account')
  console.log('=' .repeat(30))

  const args = parseArgs()
  const prisma = await createPrismaClient()

  try {
    // Check if username already exists
    const existing = await prisma.user.findUnique({
      where: { username: args.username },
    })

    if (existing) {
      if (args.ifExists === 'skip') {
        // Ensure existing user is email verified (for self-hosted)
        if (!existing.emailVerified) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { emailVerified: new Date() },
          })
          console.log(`ℹ️  User "${args.username}" already exists, marked as verified.`)
        } else {
          console.log(`ℹ️  User "${args.username}" already exists, skipping creation.`)
        }
        process.exit(0)
      }
      console.error(`❌ Error: User "${args.username}" already exists`)
      process.exit(1)
    }

    // Hash password
    console.log('🔒 Hashing password...')
    const hashedPassword = await bcrypt.hash(args.password, 10)

    // Calculate trial end date if plan is trial
    let trialEndsAt: Date | undefined
    if (args.plan === 'trial') {
      trialEndsAt = new Date()
      trialEndsAt.setDate(trialEndsAt.getDate() + 30)
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        username: args.username,
        password: hashedPassword,
        email: args.email || null,
        emailVerified: new Date(), // Mark as verified immediately
        subscriptionPlan: args.plan,
        trialEndsAt,
      },
    })

    console.log('')
    console.log('✅ User created successfully!')
    console.log('')
    console.log('   ID:       ' + user.id)
    console.log('   Username: ' + user.username)
    console.log('   Email:    ' + (user.email || '(not set)'))
    console.log('   Plan:     ' + user.subscriptionPlan)
    if (trialEndsAt) {
      console.log('   Trial ends: ' + trialEndsAt.toISOString().split('T')[0])
    }
    console.log('')
    console.log('🔑 You can now log in at /login')

  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      console.error(`❌ Error: Username or email already exists`)
    } else {
      console.error('❌ Error creating user:', error)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
