import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  /** Child components to protect with error boundary */
  children: ReactNode
  /** Optional custom fallback UI to show on error */
  fallback?: ReactNode
}

interface State {
  /** Whether an error has been caught */
  hasError: boolean
  /** The caught error object */
  error?: Error
}

/**
 * Error Boundary component to catch React errors gracefully
 *
 * @remarks
 * - Catches errors in child component tree
 * - Displays user-friendly error message
 * - Allows page reload to recover
 * - Logs errors to console for debugging
 * - Supports custom fallback UI
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  /**
   * Log error details for debugging
   */
  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    // TODO: Send to error tracking service (e.g., Sentry)
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl text-destructive">Something went wrong</CardTitle>
              <CardDescription>An unexpected error occurred</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  <p className="font-mono">{this.state.error.message}</p>
                </div>
              )}
              <Button onClick={() => window.location.reload()} className="w-full">
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
