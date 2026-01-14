'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { MapPin, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { TimezoneCombobox } from '@/components/TimezoneCombobox'
import { searchCitiesAction, getTimezoneAction } from '@/actions/geonames'
import { cn } from '@/lib/utils/cn'

export interface LocationData {
  city: string
  nation: string
  latitude: number
  longitude: number
  timezone: string
}

interface RelocationDialogProps {
  currentLocation?: LocationData | null
  onLocationChange: (location: LocationData | null) => void
}

interface CitySuggestion {
  label: string
  value: string
  name: string
  countryCode: string
  latitude: number
  longitude: number
}

export function RelocationDialog({ currentLocation, onLocationChange }: RelocationDialogProps) {
  const [open, setOpen] = useState(false)
  const [isManual, setIsManual] = useState(false)

  // Search State
  const [cityInput, setCityInput] = useState('')
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Manual Entry State
  const [manualData, setManualData] = useState({
    latitude: '',
    longitude: '',
    timezone: '',
    city: 'Custom Location',
    nation: 'CM',
  })

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCityInput('')
      setSuggestions([])
      setError(null)
      setIsManual(false)
      setManualData({
        latitude: '',
        longitude: '',
        timezone: '',
        city: 'Custom Location',
        nation: 'CM',
      })
    }
  }, [open])

  // Handle City Search
  useEffect(() => {
    if (isManual) return

    const term = cityInput.trim()
    if (term.length < 2) {
      setSuggestions([])
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    const timer = setTimeout(() => {
      searchCitiesAction(term)
        .then((list) => {
          if (!active) return
          const mapped = list.map((item) => ({
            label: `${item.name}${item.adminName ? `, ${item.adminName}` : ''} (${item.countryName ?? item.countryCode ?? ''})`,
            value: `${item.name}-${item.latitude}-${item.longitude}`, // Unique value for cmdk
            name: item.name,
            countryCode: item.countryCode || '',
            latitude: item.latitude,
            longitude: item.longitude,
          }))
          setSuggestions(mapped)
          setLoading(false)
        })
        .catch(() => {
          if (!active) return
          setLoading(false)
          setError('Failed to search cities')
        })
    }, 350)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [cityInput, isManual])

  const handleCitySelect = async (suggestion: CitySuggestion) => {
    setLoading(true)
    try {
      const timezone = await getTimezoneAction(suggestion.latitude, suggestion.longitude)
      const newLocation: LocationData = {
        city: suggestion.name,
        nation: suggestion.countryCode,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        timezone,
      }
      onLocationChange(newLocation)
      setOpen(false)
    } catch {
      setError('Failed to fetch timezone info')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = () => {
    const lat = parseFloat(manualData.latitude)
    const lng = parseFloat(manualData.longitude)

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Invalid latitude (-90 to 90)')
      return
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('Invalid longitude (-180 to 180)')
      return
    }
    if (!manualData.timezone) {
      setError('Timezone is required')
      return
    }

    const newLocation: LocationData = {
      city: manualData.city || 'Custom Location',
      nation: manualData.nation || 'CM',
      latitude: lat,
      longitude: lng,
      timezone: manualData.timezone,
    }
    onLocationChange(newLocation)
    setOpen(false)
  }

  const handleReset = () => {
    onLocationChange(null)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          title={currentLocation ? `${currentLocation.city}, ${currentLocation.nation}` : 'Relocate'}
        >
          <MapPin className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Location</DialogTitle>
          <DialogDescription>
            Search for a city or enter coordinates manually to relocate the transit chart.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center space-x-2 py-2">
          <Switch id="manual-mode" checked={isManual} onCheckedChange={setIsManual} />
          <Label htmlFor="manual-mode">Manual Coordinates</Label>
        </div>

        <div className="py-2 min-h-[300px]">
          {isManual ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="lat">Latitude</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="0.0001"
                    min={-90}
                    max={90}
                    placeholder="e.g. 41.9028"
                    value={manualData.latitude}
                    onChange={(e) => setManualData({ ...manualData, latitude: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lng">Longitude</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="0.0001"
                    min={-180}
                    max={180}
                    placeholder="e.g. 12.4964"
                    value={manualData.longitude}
                    onChange={(e) => setManualData({ ...manualData, longitude: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Timezone</Label>
                <TimezoneCombobox
                  value={manualData.timezone}
                  onChange={(val) => setManualData({ ...manualData, timezone: val })}
                  side="top"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          ) : (
            <>
              <Command className="rounded-lg border shadow-md h-full" shouldFilter={false}>
                <CommandInput placeholder="Search city..." value={cityInput} onValueChange={setCityInput} />
                <CommandList className="max-h-[250px] overflow-y-auto">
                  {loading && (
                    <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                    </div>
                  )}

                  {!loading && suggestions.length === 0 && cityInput.length >= 2 && (
                    <CommandEmpty>No cities found.</CommandEmpty>
                  )}

                  {!loading && suggestions.length > 0 && (
                    <CommandGroup heading="Suggestions">
                      {suggestions.map((suggestion) => (
                        <CommandItem
                          key={suggestion.value}
                          value={suggestion.value}
                          onSelect={() => handleCitySelect(suggestion)}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              currentLocation?.city === suggestion.name &&
                                currentLocation?.nation === suggestion.countryCode
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                          {suggestion.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
              {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <div className="flex w-full items-center justify-between">
            {currentLocation ? (
              <Button variant="ghost" onClick={handleReset}>
                Reset
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              {isManual && <Button onClick={handleManualSubmit}>Apply</Button>}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
