'use client'

import { useState } from 'react'
import { Copy, Info, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'

/**
 * Toggle this to enable/disable the AI Context Debug Dialog globally.
 * Set to false before production deployment.
 */
const DEBUG_ENABLED = true

interface AIContextDebugDialogProps {
  debugContext: string | null
  debugUserPrompt: string | null
}

export function AIContextDebugDialog({ debugContext, debugUserPrompt }: AIContextDebugDialogProps) {
  const [open, setOpen] = useState(false)

  // Quick toggle to disable debug dialog globally
  if (!DEBUG_ENABLED) return null
  if (!debugContext) return null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="ml-2 text-muted-foreground hover:text-foreground"
          title="View AI Context"
        >
          <Info className="h-4 w-4" />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed top-[50%] left-[50%] z-50 translate-x-[-50%] translate-y-[-50%]',
            'w-[90vw] max-w-5xl h-[80vh]',
            'bg-background rounded-lg border shadow-lg',
            'flex flex-col p-0 gap-0 overflow-hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'focus:outline-none',
          )}
        >
          {/* Header */}
          <div className="p-6 border-b shrink-0 flex items-center justify-between">
            <DialogPrimitive.Title className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Interpretation Context
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
              <span className="sr-only">Close</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </DialogPrimitive.Close>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="context" className="w-full h-full flex flex-col">
              <div className="px-6 pt-4 shrink-0">
                <TabsList className="w-full justify-start h-auto p-1 bg-muted/50">
                  <TabsTrigger value="context" className="px-4 py-2">
                    Chart Context
                  </TabsTrigger>
                  <TabsTrigger value="prompt" className="px-4 py-2">
                    Full User Prompt
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="context" className="flex-1 mt-0 p-6 overflow-hidden min-h-0">
                <div className="relative group w-full h-full rounded-md border bg-muted/30 p-4 overflow-auto">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(debugContext || '')
                      toast.success('Context copied to clipboard')
                    }}
                    className="absolute top-2 right-2 p-2 rounded-md bg-background/80 border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-words">
                    {debugContext}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="prompt" className="flex-1 mt-0 p-6 overflow-hidden min-h-0">
                <div className="relative group w-full h-full rounded-md border bg-muted/30 p-4 overflow-auto">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(debugUserPrompt || '')
                      toast.success('Prompt copied to clipboard')
                    }}
                    className="absolute top-2 right-2 p-2 rounded-md bg-background/80 border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-words">
                    {debugUserPrompt || 'No prompt available'}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
