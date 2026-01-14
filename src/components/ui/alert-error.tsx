import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface AlertErrorProps {
  title?: string
  error?: Error | string | null
}

export function AlertError({ title = 'Unable to load data', error }: AlertErrorProps) {
  const [showDetails, setShowDetails] = useState(false)
  const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error'

  return (
    <Alert variant="destructive" className="border-destructive/30 bg-destructive/5 text-destructive-foreground">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="text-destructive font-medium">{title}</AlertTitle>
      <AlertDescription className="text-destructive/90">
        <p className="mb-2">We encountered an issue while retrieving this information. Please try again.</p>

        {errorMessage && (
          <div className="mt-2 text-sm">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider opacity-70 hover:opacity-100 transition-opacity"
            >
              {showDetails ? (
                <>
                  Hide Details <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Show Details <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>

            {showDetails && (
              <div className="mt-1 rounded bg-white/50 dark:bg-black/20 p-2 font-mono text-xs overflow-x-auto">
                {errorMessage}
              </div>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}
