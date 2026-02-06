'use client'

/**
 * Clear Cache Button Component
 *
 * Allows users to clear all client-side caches from the settings page.
 * This includes IndexedDB caches for ephemeris, transits, and interpretations.
 *
 * @module components/settings/ClearCacheButton
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2, Loader2, CheckCircle, Database } from 'lucide-react'
import { toast } from 'sonner'
import { clientLogger } from '@/lib/logging/client'

export function ClearCacheCard() {
  const [isClearing, setIsClearing] = useState(false)
  const [lastCleared, setLastCleared] = useState<Date | null>(null)

  const handleClearCache = async () => {
    setIsClearing(true)
    try {
      // Dynamically import to avoid loading cache modules on page load
      const { clearAllCaches } = await import('@/lib/cache/cleanup')
      const allCachesCleared = await clearAllCaches()

      if (allCachesCleared) {
        setLastCleared(new Date())
        toast.success('All caches cleared successfully')
      } else {
        toast.error('Some caches could not be cleared')
      }
    } catch (error) {
      clientLogger.error('Failed to clear caches:', error)
      toast.error('Failed to clear caches')
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Local Cache
        </CardTitle>
        <CardDescription>
          Clear cached data stored in your browser. This includes ephemeris data, transit calculations, and AI
          interpretations. Clearing the cache may temporarily slow down chart calculations until the data is
          recalculated.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {lastCleared ? (
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Last cleared: {lastCleared.toLocaleTimeString()}
              </span>
            ) : (
              'Cache has not been cleared in this session'
            )}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={isClearing}>
                {isClearing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Cache
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all cached data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will clear all locally cached calculation and interpretation data from your browser.
                </AlertDialogDescription>
                <div className="text-muted-foreground text-sm space-y-2">
                  <p>This includes:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Ephemeris calculations (planetary positions)</li>
                    <li>Transit calculations</li>
                    <li>AI-generated interpretations</li>
                  </ul>
                  <p>This will not affect your saved charts or subjects. The data will be recalculated when needed.</p>
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearCache}>Clear Cache</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
