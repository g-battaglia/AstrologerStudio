'use client'

import { useId, useState, type KeyboardEvent } from 'react'
import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { useUIPreferences } from '@/stores/uiPreferences'

import { AspectGridLegend } from './charts/AspectGridLegend'

type Props = {
  html?: string
  children?: React.ReactNode
  className?: string
  id?: string
  rowLabel?: string
  colLabel?: string
}

export default function AspectsCard({ html, children, className, id = 'aspects-card', rowLabel, colLabel }: Props) {
  const contentId = useId()
  const collapsed = useUIPreferences((state) => state.collapsed[id] ?? false)
  const toggleCollapsed = useUIPreferences((state) => state.toggleCollapsed)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = () => {
    if (!collapsed && (html || children)) {
      setIsModalOpen(true)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleOpenModal()
    }
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <Card className={cn('bg-background/80 backdrop-blur-sm w-full min-w-[260px] gap-0 py-0', className)}>
        <CardHeader
          className={cn('flex items-center justify-between gap-2 px-4 py-2.5 pb-2!', !collapsed && 'border-b')}
        >
          <CardTitle>Aspects</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            aria-label={collapsed ? 'Espandi tabella degli aspetti' : 'Comprimi tabella degli aspetti'}
            aria-expanded={!collapsed}
            aria-controls={contentId}
            className={cn(
              'transition-transform hover:bg-transparent dark:hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 active:bg-transparent h-8 w-8',
              collapsed ? 'rotate-180' : '',
            )}
            type="button"
            onClick={() => toggleCollapsed(id)}
          >
            <ChevronDown className="size-4" />
          </Button>
        </CardHeader>

        <CardContent
          id={contentId}
          className={cn(
            'w-full px-4 pb-4 transition-[max-height,opacity,padding] duration-200 ease-in-out',
            collapsed ? 'max-h-0 overflow-hidden opacity-0 pt-0 pb-0' : 'max-h-[1000px] opacity-100 pt-3',
          )}
          aria-hidden={collapsed}
        >
          <div
            role="button"
            tabIndex={collapsed ? -1 : 0}
            aria-label="Mostra aspetti ingranditi"
            className={cn(
              'focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-2 focus-visible:outline-hidden rounded-md',
              collapsed ? 'cursor-default' : 'cursor-zoom-in',
            )}
            onClick={handleOpenModal}
            onKeyDown={handleKeyDown}
          >
            {rowLabel && colLabel && <AspectGridLegend rowLabel={rowLabel} colLabel={colLabel} />}
            {children ? children : <div dangerouslySetInnerHTML={{ __html: html || '' }} />}
          </div>
        </CardContent>
      </Card>

      <DialogContent className="max-w-[100vw] sm:max-w-[60vw] w-[90vw] h-[50vh] sm:h-[80vh] p-4 sm:p-6 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Aspects</DialogTitle>
        </VisuallyHidden>
        <div className="h-full w-full overflow-hidden rounded-lg bg-background p-4 flex flex-col">
          <div className="shrink-0 mb-4">
            {rowLabel && colLabel && (
              <AspectGridLegend
                rowLabel={rowLabel}
                colLabel={colLabel}
                className="text-base sm:text-lg gap-x-6 gap-y-2 [&_svg]:size-5"
              />
            )}
          </div>
          <div className="flex-1 min-h-0 w-full flex items-center justify-center">
            {children ? (
              children
            ) : (
              <div
                className="w-full h-full flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:max-w-full [&_svg]:max-h-full"
                dangerouslySetInnerHTML={{ __html: html || '' }}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
