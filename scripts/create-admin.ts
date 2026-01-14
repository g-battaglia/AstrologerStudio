#!/usr/bin/env bun
/* eslint-disable no-console */
/**
 * Create Admin Script
 * 
 * Creates an administrator account for self-hosted deployments.
 * 
 * Usage:
 *   bun run scripts/create-admin.ts --username <name> --password <pass> [options]
 * 
 * Options:
 *   --username   Required. The admin username
 *   --password   Required. The admin password (min 8 characters)
 *   --email      Optional. Admin email address
 *   --role       Optional. Admin role: admin or superadmin (default: admin)
 * 
 * Examples:
 *   bun run scripts/create-admin.ts --username admin --password "AdminPass123!"
 *   bun run scripts/create-admin.ts --username superadmin --password "SuperPass123!" --role superadmin
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
  role: 'admin' | 'superadmin'
  ifExists: 'error' | 'skip'
}

function printUsage(): void {
  console.log(`
🛡️  Create Admin Script
=======================

Usage:
  bun run public-repo/create-admin.ts --username <name> --password <pass> [options]

Options:
  --username    Required. The admin username
  --password    Required. The admin password (min 8 characters)
  --email       Optional. Admin email address
  --role        Optional. Admin role (default: admin)
                - admin: can view stats and manage users
                - superadmin: can also manage other admins and delete users
  --if-exists   Optional. Behavior when admin exists: error (default), skip

Examples:
  bun run public-repo/create-admin.ts --username admin --password "AdminPass123!"
  bun run public-repo/create-admin.ts --username admin --password "AdminPass123!" --email admin@example.com
  bun run public-repo/create-admin.ts --username superadmin --password "SuperPass123!" --role superadmin
  bun run public-repo/create-admin.ts --username admin --password "AdminPass123!" --if-exists skip
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

  const role = parsed.role === 'superadmin' ? 'superadmin' : 'admin'

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
    role,
    ifExists,
  }
}

async function main() {
  console.log('🛡️  Create Admin Account')
  console.log('=' .repeat(30))

  const args = parseArgs()
  const prisma = await createPrismaClient()

  try {
    // Check if username already exists
    const existing = await prisma.adminUser.findUnique({
      where: { username: args.username },
    })

    if (existing) {
      if (args.ifExists === 'skip') {
        console.log(`ℹ️  Admin user "${args.username}" already exists, skipping creation.`)
        process.exit(0)
      }
      console.error(`❌ Error: Admin user "${args.username}" already exists`)
      process.exit(1)
    }

    // Check if email already exists (if provided)
    if (args.email) {
      const existingEmail = await prisma.adminUser.findUnique({
        where: { email: args.email },
      })
      if (existingEmail) {
        console.error(`❌ Error: Email "${args.email}" is already in use`)
        process.exit(1)
      }
    }

    // Hash password (higher cost for admin accounts)
    console.log('🔒 Hashing password...')
    const hashedPassword = await bcrypt.hash(args.password, 12)

    // Create admin user
    const admin = await prisma.adminUser.create({
      data: {
        username: args.username,
        password: hashedPassword,
        email: args.email || null,
        role: args.role,
      },
    })

    console.log('')
    console.log('✅ Admin user created successfully!')
    console.log('')
    console.log('   ID:       ' + admin.id)
    console.log('   Username: ' + admin.username)
    console.log('   Email:    ' + (admin.email || '(not set)'))
    console.log('   Role:     ' + admin.role)
    console.log('')
    console.log('🔑 You can now log in at /admin/login')

  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      console.error(`❌ Error: Username or email already exists`)
    } else {
      console.error('❌ Error creating admin:', error)
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
