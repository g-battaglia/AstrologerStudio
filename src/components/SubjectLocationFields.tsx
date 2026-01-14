'use client'

import { useEffect, useMemo, useState } from 'react'
import type { UseFormReturn, Path, PathValue } from 'react-hook-form'
import { useWatch } from 'react-hook-form'
import { Loader2, MapPin, ChevronsUpDownIcon, CheckIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { TimezoneCombobox } from '@/components/TimezoneCombobox'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { searchCitiesAction, getLocationDetailsAction, getTimezoneAction } from '@/actions/geonames'
import { COUNTRY_OPTIONS } from '@/lib/geo/countries'
import { cn } from '@/lib/utils/cn'

export interface LocationFormValues {
  city?: string
  nation?: string
  latitude?: number
  longitude?: number
  timezone: string
}

interface SubjectLocationFieldsProps<FormValues extends LocationFormValues> {
  form: UseFormReturn<FormValues>
  disabled?: boolean
  dialogOpen: boolean
  idPrefix: string
}

// Type-safe form field setter to avoid `as any` assertions
function setField<TForm extends LocationFormValues>(
  form: UseFormReturn<TForm>,
  field: keyof LocationFormValues,
  value: string | number | undefined,
  options?: { shouldDirty?: boolean },
): void {
  const fieldPath = field as Path<TForm>
  const fieldValue = value as PathValue<TForm, typeof fieldPath>
  form.setValue(fieldPath, fieldValue, options)
}

export function SubjectLocationFields<FormValues extends LocationFormValues>({
  form,
  disabled = false,
  dialogOpen,
  idPrefix,
}: SubjectLocationFieldsProps<FormValues>) {
  const city = useWatch({ control: form.control, name: 'city' as Path<FormValues> }) as string | undefined
  const nation = useWatch({ control: form.control, name: 'nation' as Path<FormValues> }) as string | undefined
  const latitude = useWatch({ control: form.control, name: 'latitude' as Path<FormValues> }) as number | undefined
  const longitude = useWatch({ control: form.control, name: 'longitude' as Path<FormValues> }) as number | undefined
  const timezone = useWatch({ control: form.control, name: 'timezone' as Path<FormValues> }) as string | undefined
  const [manualCoordinates, setManualCoordinates] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [lastLookupKey, setLastLookupKey] = useState<string | null>(null)
  const [cityInput, setCityInput] = useState('')
  const [selectedCityLabel, setSelectedCityLabel] = useState<string | null>(
    typeof form.getValues('city' as Path<FormValues>) === 'string'
      ? (form.getValues('city' as Path<FormValues>) as string)
      : null,
  )
  const [citySuggestions, setCitySuggestions] = useState<
    { label: string; value: string; countryCode?: string; latitude: number; longitude: number }[]
  >([])
  const [cityLoading, setCityLoading] = useState(false)
  const [cityError, setCityError] = useState<string | null>(null)
  const [countryOpen, setCountryOpen] = useState(false)
  const [countryQuery, setCountryQuery] = useState('')

  const dirtyFields = form.formState.dirtyFields
  const locationDirty = Boolean(dirtyFields?.city || dirtyFields?.nation)
  const locationKey = useMemo(() => {
    const parts = [city, nation].map((v) => (typeof v === 'string' ? v.trim().toLowerCase() : '')).filter(Boolean)
    return parts.length ? parts.join('|') : null
  }, [city, nation])
  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase()
    if (!q) return COUNTRY_OPTIONS
    return COUNTRY_OPTIONS.filter(({ code, name }) => code.toLowerCase().includes(q) || name.toLowerCase().includes(q))
  }, [countryQuery])

  // Reset switch and status when the dialog is reopened
  useEffect(() => {
    setManualCoordinates(false)
    setStatus('idle')
    setStatusMessage(null)
    setLastLookupKey(null)

    const currentCity = form.getValues().city
    setCityInput(typeof currentCity === 'string' ? currentCity : '')

    setSelectedCityLabel(null)
    setCitySuggestions([])
    setCityError(null)
    setCountryQuery('')
    setCountryOpen(false)
  }, [dialogOpen, form])

  useEffect(() => {
    if (!manualCoordinates && !locationKey) {
      setStatus('idle')
      setStatusMessage(null)
    }
  }, [locationKey, manualCoordinates])

  useEffect(() => {
    if (typeof city === 'string' && city !== cityInput) {
      setCityInput(city)
      setSelectedCityLabel(city)
    }
  }, [city, cityInput])

  useEffect(() => {
    if (manualCoordinates) {
      setCitySuggestions([])
      setCityError(null)
      setCityLoading(false)
      return
    }

    const term = cityInput.trim()
    const isSelectedLabel = selectedCityLabel && term === selectedCityLabel.trim()
    if (term.length < 2 || isSelectedLabel) {
      setCitySuggestions([])
      setCityError(null)
      setCityLoading(false)
      return
    }

    // Server actions do not support AbortSignal cancellation directly from client
    // We handle the "cancellation" by checking if the component is still mounted/valid via a flag
    // or just relying on the debounce + the fact that we clear suggestions on change.
    let active = true

    setCityLoading(true)
    setCityError(null)
    const timer = window.setTimeout(() => {
      searchCitiesAction(term, typeof nation === 'string' && nation.length === 2 ? nation : undefined)
        .then((list) => {
          if (!active) return
          const mapped = list.map((item) => ({
            label: `${item.name}${item.adminName ? `, ${item.adminName}` : ''} (${item.countryName ?? item.countryCode ?? ''})`,
            value: item.name,
            countryCode: item.countryCode,
            latitude: item.latitude,
            longitude: item.longitude,
          }))
          setCitySuggestions(mapped)
          setCityLoading(false)
        })
        .catch((err) => {
          if (!active) return
          setCityLoading(false)
          setCityError(err instanceof Error ? err.message : 'Unable to search cities')
        })
    }, 350)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [cityInput, nation, selectedCityLabel, manualCoordinates])

  const shouldFetch = useMemo(() => {
    if (manualCoordinates) return false
    if (!locationKey) return false
    const hasCity = typeof city === 'string' && city.trim().length > 0
    if (!hasCity) return false

    const missingCoords = latitude === undefined || longitude === undefined
    const missingTimezone = !timezone
    const alreadyFetched = lastLookupKey !== null && lastLookupKey === locationKey

    if (alreadyFetched) return false

    return missingCoords || missingTimezone || locationDirty
  }, [manualCoordinates, city, latitude, longitude, timezone, locationDirty, lastLookupKey, locationKey])

  useEffect(() => {
    if (!shouldFetch || !locationKey) return

    let active = true
    setLastLookupKey(locationKey)
    setStatus('loading')
    setStatusMessage(null)

    const timer = window.setTimeout(() => {
      getLocationDetailsAction(city, nation)
        .then(({ latitude: lat, longitude: lng, timezone: tz }) => {
          if (!active) return
          setField(form, 'latitude', lat, { shouldDirty: true })
          setField(form, 'longitude', lng, { shouldDirty: true })
          setField(form, 'timezone', tz, { shouldDirty: true })
          setStatus('success')
          setStatusMessage('Coordinates auto-filled via GeoNames.')
        })
        .catch((err) => {
          if (!active) return
          setStatus('error')
          setStatusMessage(err instanceof Error ? err.message : 'Unable to fetch coordinates from GeoNames.')
        })
    }, 450)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [shouldFetch, city, nation, form, locationKey])

  const handleCitySelect = async (option: {
    value: string
    label: string
    countryCode?: string
    latitude: number
    longitude: number
  }) => {
    if (manualCoordinates) {
      setCitySuggestions([])
      return
    }

    setField(form, 'city', option.value, { shouldDirty: true })
    if (option.countryCode) {
      setField(form, 'nation', option.countryCode, { shouldDirty: true })
    }
    setField(form, 'latitude', option.latitude, { shouldDirty: true })
    setField(form, 'longitude', option.longitude, { shouldDirty: true })
    setSelectedCityLabel(option.label)
    setCityInput(option.label)
    setCitySuggestions([])

    const normalizedKey = [option.value, option.countryCode]
      .filter(Boolean)
      .map((v) => (v ? v.toLowerCase() : ''))
      .join('|')
    setLastLookupKey(normalizedKey)
    setStatus('loading')
    setStatusMessage(null)

    try {
      const tz = await getTimezoneAction(option.latitude, option.longitude)
      setField(form, 'timezone', tz, { shouldDirty: true })
      setStatus('success')
      setStatusMessage(null)
    } catch (err) {
      setStatus('error')
      setStatusMessage(err instanceof Error ? err.message : 'Unable to fetch timezone')
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor={`${idPrefix}_city`}>
            City
          </label>
          <div className="relative">
            <input
              id={`${idPrefix}_city`}
              className="border rounded px-2 py-1 text-sm bg-background w-full h-10"
              placeholder="City"
              value={cityInput}
              onChange={(e) => {
                setCityInput(e.target.value)
                setSelectedCityLabel(null)
                setField(form, 'city', e.target.value, { shouldDirty: true })
                setLastLookupKey(null)
              }}
              disabled={disabled}
              autoComplete="off"
            />
            {(cityLoading || cityError || citySuggestions.length > 0) && (
              <div className="absolute z-20 mt-1 w-full rounded-md border border-border/70 bg-background shadow-lg">
                {cityLoading && (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> Searching...
                  </div>
                )}
                {cityError && (
                  <div className="px-3 py-2 text-xs text-destructive border-b border-border/60">{cityError}</div>
                )}
                {!cityLoading &&
                  citySuggestions.map((option) => (
                    <button
                      type="button"
                      key={`${option.value}-${option.latitude}-${option.longitude}`}
                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-muted/70 text-sm"
                      onClick={() => handleCitySelect(option)}
                    >
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        Lat {option.latitude.toFixed(4)}, Lng {option.longitude.toFixed(4)}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
          {form.formState.errors.city && (
            <span className="text-xs text-destructive">{form.formState.errors.city.message as string}</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor={`${idPrefix}_nation`}>
            Nation
          </label>
          <Popover open={countryOpen} onOpenChange={setCountryOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between h-10"
                disabled={disabled}
                id={`${idPrefix}_nation`}
              >
                {(() => {
                  const current = COUNTRY_OPTIONS.find((c) => c.code === nation)
                  return current ? `${current.code} — ${current.name}` : 'Select nation'
                })()}
                <ChevronsUpDownIcon className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[--radix-popover-trigger-width] max-h-[320px]">
              <Command>
                <CommandInput
                  placeholder="Search nation..."
                  value={countryQuery}
                  onValueChange={setCountryQuery}
                  className="h-10"
                />
                <CommandList>
                  <CommandEmpty>No nation found.</CommandEmpty>
                  <CommandGroup>
                    {filteredCountries.map((country) => (
                      <CommandItem
                        key={country.code}
                        value={country.code}
                        onSelect={(val) => {
                          setField(form, 'nation', val, { shouldDirty: true })
                          setCountryOpen(false)
                          setCountryQuery('')
                        }}
                      >
                        <CheckIcon
                          className={cn('mr-2 h-4 w-4', nation === country.code ? 'opacity-100' : 'opacity-0')}
                        />
                        {country.code} — {country.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {form.formState.errors.nation && (
            <span className="text-xs text-destructive">{form.formState.errors.nation.message as string}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-dashed border-border/70 bg-background px-3 py-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium leading-tight">Coordinates</p>
              <p className="text-xs text-muted-foreground leading-tight">
                Auto-fill with GeoNames or toggle to edit manually.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id={`${idPrefix}_manual_coordinates`}
              checked={manualCoordinates}
              onCheckedChange={(checked) => {
                setManualCoordinates(checked)
                if (checked) {
                  setStatus('idle')
                  setStatusMessage(null)
                  setCitySuggestions([])
                  setCityLoading(false)
                  setCityError(null)
                } else {
                  setLastLookupKey(null)
                }
              }}
              disabled={disabled}
            />
            <label className="text-sm" htmlFor={`${idPrefix}_manual_coordinates`}>
              Manually set coordinates
            </label>
          </div>
        </div>

        {!manualCoordinates && statusMessage && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1 text-xs',
              status === 'error' ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {status === 'loading' ? <Loader2 className="size-3 animate-spin" /> : null}
            <span>{statusMessage}</span>
          </div>
        )}
        {!manualCoordinates &&
          (form.formState.errors.timezone || form.formState.errors.latitude || form.formState.errors.longitude) && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1 text-xs text-destructive">
              {(form.formState.errors.timezone?.message as string) ||
                (form.formState.errors.latitude?.message as string) ||
                (form.formState.errors.longitude?.message as string) ||
                'Coordinates are required.'}{' '}
              Toggle manual coordinates to fix them or adjust the location.
            </div>
          )}

        {manualCoordinates && (
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Timezone</label>
              <TimezoneCombobox
                value={timezone || ''}
                onChange={(v) => setField(form, 'timezone', v)}
                disabled={disabled}
                side="bottom"
              />
              {form.formState.errors.timezone && (
                <span className="text-xs text-destructive">{form.formState.errors.timezone.message as string}</span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor={`${idPrefix}_latitude`}>
                  Latitude
                </label>
                <input
                  id={`${idPrefix}_latitude`}
                  type="number"
                  step="0.0001"
                  min={-90}
                  max={90}
                  className="border rounded px-2 py-1 text-sm bg-background"
                  placeholder="-90 a 90"
                  value={latitude ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    setField(form, 'latitude', v === '' ? undefined : Number(v))
                  }}
                  disabled={disabled}
                />
                {form.formState.errors.latitude && (
                  <span className="text-xs text-destructive">{form.formState.errors.latitude.message as string}</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor={`${idPrefix}_longitude`}>
                  Longitude
                </label>
                <input
                  id={`${idPrefix}_longitude`}
                  type="number"
                  step="0.0001"
                  min={-180}
                  max={180}
                  className="border rounded px-2 py-1 text-sm bg-background"
                  placeholder="-180 a 180"
                  value={longitude ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    setField(form, 'longitude', v === '' ? undefined : Number(v))
                  }}
                  disabled={disabled}
                />
                {form.formState.errors.longitude && (
                  <span className="text-xs text-destructive">{form.formState.errors.longitude.message as string}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
