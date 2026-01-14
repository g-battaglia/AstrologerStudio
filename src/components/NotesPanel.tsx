'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { AlertTriangle, CloudOff, Loader2, Sparkles, Trash2, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { markdownComponents } from '@/components/ui/markdown-components'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { useAIInterpretation } from '@/stores/aiInterpretationSettings'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AIContextDebugDialog } from '@/components/AIContextDebugDialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { clientLogger } from '@/lib/logging/client'

import { useAIUsage } from '@/hooks/useAIUsage'
import { useQueryClient } from '@tanstack/react-query'
import { useWakeLock } from '@/hooks/useWakeLock'
import { getInterpretation, saveInterpretationChunk, deleteInterpretation } from '@/lib/cache/interpretations'

/** Result from AI generation including debug context */
export interface AIGenerationResult {
  text: string
  debugContext?: string
  debugUserPrompt?: string
}

interface NotesPanelProps {
  savedChartId?: string
  initialNotes?: string
  notes?: string
  onNotesChange?: (notes: string) => void
  onGenerateAI?: (
    onStreamUpdate?: (text: string) => void,
    signal?: AbortSignal,
    relationshipType?: string,
  ) => Promise<AIGenerationResult>
  /** If true, shows a warning that chart data has changed since AI was generated */
  isDataStale?: boolean
  /** Label describing what the stale notes were generated for (e.g., "Dec 15, 2024" or "2025") */
  staleDataLabel?: string
  showRelationshipSelector?: boolean
  /** Unique identifier for caching interpretation in IndexedDB */
  chartId?: string
}

export function NotesPanel({
  savedChartId,
  initialNotes = '',
  notes: propNotes,
  onNotesChange,
  onGenerateAI,
  isDataStale = false,
  staleDataLabel,
  showRelationshipSelector = false,
  chartId,
}: NotesPanelProps) {
  const [localNotes, setLocalNotes] = useState(initialNotes)
  const notes = propNotes !== undefined ? propNotes : localNotes
  const abortControllerRef = useRef<AbortController | null>(null)

  const { data: usageData } = useAIUsage()
  const queryClient = useQueryClient()
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock()
  const isRestoredRef = useRef(false)

  const handleNotesChange = useCallback(
    (newNotes: string) => {
      setLocalNotes(newNotes)
      onNotesChange?.(newNotes)
    },
    [onNotesChange],
  )

  // Auto-restore from IndexedDB on mount
  useEffect(() => {
    if (!chartId || isRestoredRef.current) return

    const restoreFromCache = async () => {
      try {
        const cached = await getInterpretation(chartId)
        if (cached && cached.content) {
          handleNotesChange(cached.content)
          isRestoredRef.current = true
          setIsFromCache(true) // Mark as restored from local cache
          setIsCacheAlertDismissed(false)
          clientLogger.debug('Restored interpretation from cache for:', chartId)
        }
      } catch (error) {
        clientLogger.error('Failed to restore interpretation from cache:', error)
      }
    }

    restoreFromCache()
  }, [chartId, handleNotesChange])

  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('view')
  const { selectedSchool } = useAIInterpretation()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const [isWarningDismissed, setIsWarningDismissed] = useState(false)
  const [relationshipType, setRelationshipType] = useState('generic')
  // Track if notes are only in local cache (not saved to DB)
  const [isFromCache, setIsFromCache] = useState(false)
  const [isCacheAlertDismissed, setIsCacheAlertDismissed] = useState(false)
  // Debug context viewer
  const [debugContext, setDebugContext] = useState<string | null>(null)
  const [debugUserPrompt, setDebugUserPrompt] = useState<string | null>(null)

  const handleSave = async () => {
    if (!savedChartId) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/saved-charts/${savedChartId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })

      if (!res.ok) throw new Error('Failed to save notes')
      onNotesChange?.(notes)
      setIsFromCache(false) // Notes are now saved to DB
      // Clear from IndexedDB cache since it's now in the database
      if (chartId) {
        await deleteInterpretation(chartId)
      }
      toast.success('Notes saved successfully')
    } catch (error) {
      clientLogger.error('Error saving notes:', error)
      toast.error('Failed to save notes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerateAI = async () => {
    if (!onGenerateAI) return

    setIsGenerating(true)
    setActiveTab('view')
    setIsWarningDismissed(false) // Reset warning state for fresh generation

    // Request wake lock to prevent screen sleep during generation
    await requestWakeLock()

    // Optimistic update
    const previousUsage = queryClient.getQueryData<{ usage: number; remaining: number }>(['ai-usage'])
    if (previousUsage) {
      queryClient.setQueryData(['ai-usage'], {
        ...previousUsage,
        usage: previousUsage.usage + 1,
        remaining: Math.max(0, previousUsage.remaining - 1),
      })
    }

    try {
      const controller = new AbortController()
      abortControllerRef.current = controller

      // Wrap the stream callback to also save to IndexedDB progressively
      const handleStreamUpdate = (text: string) => {
        handleNotesChange(text)
        // Save progressively to IndexedDB (non-blocking)
        if (chartId) {
          saveInterpretationChunk(chartId, text, false).catch(() => {})
        }
      }

      const result = await onGenerateAI(handleStreamUpdate, controller.signal, relationshipType)
      handleNotesChange(result.text)

      // Store debug context for viewing
      if (result.debugContext) setDebugContext(result.debugContext)
      if (result.debugUserPrompt) setDebugUserPrompt(result.debugUserPrompt)

      // Mark interpretation as complete in IndexedDB
      if (chartId) {
        await saveInterpretationChunk(chartId, result.text, true)
      }

      queryClient.invalidateQueries({ queryKey: ['ai-usage'] })
    } catch (error) {
      // Revert on error if needed, but invalidation in finally will handle it usually.
      // Explicitly invalidating here to be sure if error occurs we sync back.
      queryClient.invalidateQueries({ queryKey: ['ai-usage'] })

      if (error instanceof Error && error.name === 'AbortError') {
        toast.info('Generation stopped')
        // Keep partial content in cache for abort case
      } else {
        clientLogger.error('Error generating notes:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate notes'
        toast.error(errorMessage)
      }
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
      // Release wake lock
      await releaseWakeLock()
      // Ensure we sync with server reality (e.g. if user stopped and it wasn't counted)
      queryClient.invalidateQueries({ queryKey: ['ai-usage'] })
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsGenerating(false)
    }
  }

  const handleDeleteNotes = async () => {
    handleNotesChange('')
    setShowDeleteDialog(false)
    // Delete from IndexedDB cache
    if (chartId) {
      await deleteInterpretation(chartId)
    }
    toast.success('Notes deleted')
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {(!notes || isGenerating) && (
        <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full text-primary shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-medium leading-none">AI Interpretation</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
                  <Badge
                    variant="outline"
                    className="h-5 px-1.5 text-[10px] uppercase tracking-wider font-normal bg-background/50"
                  >
                    {{
                      modern: 'Modern Astrology',
                      traditional: 'Traditional Astrology',
                      psychological: 'Psychological Astrology',
                      evolutionary: 'Evolutionary Astrology',
                      vedic: 'Vedic Astrology',
                      custom: 'Custom',
                    }[selectedSchool] || selectedSchool}
                  </Badge>
                  {usageData && (
                    <>
                      <span>•</span>
                      <span>
                        {usageData.remaining}/{usageData.limit} left
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {showRelationshipSelector && (
                <Select value={relationshipType} onValueChange={setRelationshipType} disabled={isGenerating}>
                  <SelectTrigger className="w-full sm:w-[130px] h-9">
                    <SelectValue placeholder="Relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generic">Generic</SelectItem>
                    <SelectItem value="romantic">Romantic</SelectItem>
                    <SelectItem value="friendship">Friendship</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Button
                onClick={isGenerating ? handleStop : handleGenerateAI}
                variant={isGenerating ? 'destructive' : 'default'}
                size="sm"
                className="h-9 px-4 w-full sm:w-auto"
                disabled={isGenerating && false /* enabled to allow stop */}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Stop
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="view"
              className="data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
            >
              View
            </TabsTrigger>
            <TabsTrigger
              value="edit"
              disabled={isGenerating}
              className="data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
            >
              Edit
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center">
            {/* Debug info button - shows AI context */}
            <AIContextDebugDialog debugContext={debugContext} debugUserPrompt={debugUserPrompt} />
            {notes && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="ml-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="view" className="mt-4 space-y-4">
          {isDataStale && notes && !isWarningDismissed && (
            <div className="not-prose flex items-center justify-between gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  This interpretation was generated for {staleDataLabel || 'different data'}. Consider regenerating.
                </span>
              </div>
              <button
                onClick={() => setIsWarningDismissed(true)}
                className="p-1 hover:bg-amber-500/20 rounded transition-colors shrink-0"
                aria-label="Dismiss warning"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {/* Alert for notes only in local cache */}
          {isFromCache && notes && !isCacheAlertDismissed && (
            <div className="not-prose flex items-center justify-between gap-2 p-3 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400 text-sm">
              <div className="flex items-center gap-2">
                <CloudOff className="h-4 w-4 shrink-0" />
                <span>
                  This interpretation is saved locally only. Click the save icon in the top right to persist it to the
                  database.
                </span>
              </div>
              <button
                onClick={() => setIsCacheAlertDismissed(true)}
                className="p-1 hover:bg-blue-500/20 rounded transition-colors shrink-0"
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <Card className="p-4 min-h-[400px] prose prose-sm dark:prose-invert max-w-none">
            {notes ? (
              <div className="max-w-4xl mx-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {notes}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                No notes yet. Click Generate Interpretation or switch to Edit to add notes manually.
              </p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="edit" className="mt-4 flex flex-col gap-4">
          <Textarea
            value={notes}
            onChange={(e) => {
              handleNotesChange(e.target.value)
            }}
            placeholder="Write your notes here... (Markdown supported)"
            className="min-h-[400px] font-mono text-sm"
          />
          {savedChartId && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Notes'
                )}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete notes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your notes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNotes}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
