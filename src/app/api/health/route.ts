import { NextResponse } from 'next/server'

/**
 * Health check endpoint for container orchestration
 *
 * Used by Docker HEALTHCHECK, Kubernetes probes, and Railway health checks.
 * Returns 200 OK if the server is responding.
 *
 * @example
 * ```bash
 * curl http://localhost:3000/api/health
 * # Returns: {"status":"ok","timestamp":"2024-..."}
 * ```
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}
