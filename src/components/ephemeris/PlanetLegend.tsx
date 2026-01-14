import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import type { PlanetKey, PlanetColors } from '@/types/ephemeris-view'
import { formatPlanetName } from '@/lib/astrology/planet-formatting'

type Props = {
  planetKeys: readonly PlanetKey[]
  enabled: Record<PlanetKey, boolean>
  setEnabled: (updater: (prev: Record<PlanetKey, boolean>) => Record<PlanetKey, boolean>) => void
  colors: PlanetColors
  onAll?: () => void
  onNone?: () => void
}

export function PlanetLegend({ planetKeys, enabled, setEnabled, colors, onAll, onNone }: Props) {
  const isMobile = useIsMobile()

  const handleToggle = React.useCallback(
    (key: PlanetKey) => {
      setEnabled((current) => ({ ...current, [key]: !current[key] }))
    },
    [setEnabled],
  )

  if (!planetKeys?.length) {
    return null
  }

  if (isMobile) {
    return (
      <div className="pb-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-9 w-full justify-center">
              Seleziona pianeti
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="space-y-5 px-4 pb-6 pt-5">
            <SheetHeader className="text-left">
              <SheetTitle>Pianeti visibili</SheetTitle>
            </SheetHeader>
            <div className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
              {planetKeys.map((key) => {
                const active = enabled[key]
                return (
                  <Button
                    key={key}
                    type="button"
                    variant={active ? 'default' : 'outline'}
                    className="h-11 justify-start gap-2 px-3 text-sm"
                    onClick={() => handleToggle(key)}
                  >
                    <span
                      aria-hidden
                      className="inline-block size-2 rounded-full"
                      style={{ backgroundColor: colors[key].stroke }}
                    />
                    <span>{formatPlanetName(key)}</span>
                  </Button>
                )
              })}
            </div>
            {(onAll || onNone) && (
              <div className="flex gap-2">
                {onNone && (
                  <Button type="button" size="sm" variant="outline" className="flex-1" onClick={onNone}>
                    Nessuno
                  </Button>
                )}
                {onAll && (
                  <Button type="button" size="sm" variant="outline" className="flex-1" onClick={onAll}>
                    Tutti
                  </Button>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pb-4 pt-1">
      <div className="flex flex-wrap items-center gap-2">
        {planetKeys.map((key) => {
          const active = enabled[key]
          return (
            <Button
              key={key}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleToggle(key)}
              className={`h-7 px-2 ${active ? 'opacity-100' : 'opacity-20'} text-xs`}
            >
              <span
                aria-hidden
                className="inline-block size-1.5 rounded-full"
                style={{ backgroundColor: colors[key].stroke }}
              />
              <span>{formatPlanetName(key)}</span>
            </Button>
          )
        })}
      </div>
      {onAll && (
        <Button type="button" size="sm" variant="outline" className="w-12 ml-auto h-7 px-2 text-xs" onClick={onAll}>
          All
        </Button>
      )}
      {onNone && (
        <Button type="button" size="sm" variant="outline" className="w-12 h-7 px-2 text-xs" onClick={onNone}>
          None
        </Button>
      )}
    </div>
  )
}
