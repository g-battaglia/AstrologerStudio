'use client'

import { useState, useEffect, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CloudOff, Loader2, Sparkles, Trash2, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import { markdownComponents } from '@/components/ui/markdown-components'
import { Badge } from '@/components/ui/badge'
import { useAIInterpretation } from '@/stores/aiInterpretationSettings'
import type { AIGenerationResult } from '@/components/NotesPanel'
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
import { clientLogger } from '@/lib/logging/client'

import { useAIUsage } from '@/hooks/useAIUsage'
import { useQueryClient } from '@tanstack/react-query'
import { useWakeLock } from '@/hooks/useWakeLock'
import { getInterpretation, saveInterpretationChunk, deleteInterpretation } from '@/lib/cache/interpretations'

interface SubjectNotesPanelProps {
  subjectId: string
  onGenerateAI?: (onStreamUpdate?: (text: string) => void, signal?: AbortSignal) => Promise<AIGenerationResult>
  /** Unique identifier for caching interpretation in IndexedDB */
  chartId?: string
}

export function SubjectNotesPanel({ subjectId, onGenerateAI, chartId }: SubjectNotesPanelProps) {
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('view')
  const { selectedSchool } = useAIInterpretation()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  // Track if notes are only in local cache (not saved to DB)
  const [isFromCache, setIsFromCache] = useState(false)
  const [isCacheAlertDismissed, setIsCacheAlertDismissed] = useState(false)

  const { data: usageData } = useAIUsage()
  const queryClient = useQueryClient()
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock()
  const isRestoredRef = useRef(false)

  // Load notes from API and check for cached interpretation
  useEffect(() => {
    const loadData = async () => {
      // First try to restore from IndexedDB cache
      if (chartId && !isRestoredRef.current) {
        try {
          const cached = await getInterpretation(chartId)
          if (cached && cached.content) {
            setNotes(cached.content)
            isRestoredRef.current = true
            setIsLoading(false)
            setIsFromCache(true) // Mark as restored from local cache
            setIsCacheAlertDismissed(false)
            clientLogger.debug('Restored interpretation from cache for:', chartId)
            return // Skip API load if we have cached content
          }
        } catch (error) {
          clientLogger.error('Failed to restore interpretation from cache:', error)
        }
      }

      // Load from API
      await loadNotes()
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, chartId])

  const loadNotes = async () => {
    try {
      const res = await fetch(`/api/subjects/${subjectId}/notes`)
      if (res.ok) {
        const data = await res.json()
        setNotes(data.notes || '')
      }
    } catch (error) {
      clientLogger.error('Error loading notes:', error)
      toast.error('Failed to load notes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/subjects/${subjectId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })

      if (!res.ok) throw new Error('Failed to save notes')
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
        setNotes(text)
        // Save progressively to IndexedDB (non-blocking)
        if (chartId) {
          saveInterpretationChunk(chartId, text, false).catch(() => {})
        }
      }

      const result = await onGenerateAI(handleStreamUpdate, controller.signal)
      setNotes(result.text)

      // Mark interpretation as complete in IndexedDB
      if (chartId) {
        await saveInterpretationChunk(chartId, result.text, true)
      }

      toast.success('Notes generated successfully')
      queryClient.invalidateQueries({ queryKey: ['ai-usage'] })
    } catch (error) {
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
    setIsSaving(true)
    try {
      const res = await fetch(`/api/subjects/${subjectId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: '' }),
      })

      if (!res.ok) throw new Error('Failed to delete notes')
      setNotes('')
      setShowDeleteDialog(false)

      // Delete from IndexedDB cache
      if (chartId) {
        await deleteInterpretation(chartId)
      }

      toast.success('Notes deleted')
    } catch (error) {
      clientLogger.error('Error deleting notes:', error)
      toast.error('Failed to delete notes')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {(!notes || isGenerating) && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <Sparkles className="h-5 w-5" />
                AI Interpretation
                <Badge variant="secondary" className="capitalize">
                  {selectedSchool} School
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                {usageData && (
                  <Badge variant="outline" className="mr-2">
                    {usageData?.remaining}/{usageData?.limit}
                  </Badge>
                )}
                <Button
                  onClick={isGenerating ? handleStop : handleGenerateAI}
                  variant={isGenerating ? 'destructive' : 'default'}
                  size="lg"
                  disabled={isGenerating && false}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Stop Generation
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Interpretation
                    </>
                  )}
                </Button>
              </div>
            </div>
            <CardDescription>AI-powered astrological analysis</CardDescription>
          </CardHeader>
        </Card>
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

        <TabsContent value="view" className="mt-4 space-y-4">
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
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {notes}
              </ReactMarkdown>
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
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write your notes about this subject... (Markdown supported)"
            className="min-h-[400px] font-mono text-sm"
          />
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
