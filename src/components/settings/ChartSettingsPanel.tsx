'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { type ChartPreferencesData } from '@/actions/preferences'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ALL_ASPECTS, isMajorAspect } from '@/lib/astrology/aspects'

const AVAILABLE_THEMES = ['classic', 'dark', 'light', 'strawberry', 'dark-high-contrast', 'black-and-white']

import { HOUSE_SYSTEMS, PERSPECTIVE_TYPES, SIDEREAL_MODES, ZODIAC_SYSTEMS } from '@/lib/astrology/celestial-points'
import { ALL_CELESTIAL_POINTS } from '@/lib/astrology/celestial-points'

export const DEFAULT_PREFERENCES: ChartPreferencesData = {
  theme: 'classic',

  date_format: 'EU',
  time_format: '24h',
  show_aspect_icons: true,

  show_degree_indicators: true,
  distribution_method: 'weighted',
  active_points: [
    'Sun',
    'Moon',
    'Mercury',
    'Venus',
    'Mars',
    'Jupiter',
    'Saturn',
    'Uranus',
    'Neptune',
    'Pluto',
    'True_North_Lunar_Node',
    'True_South_Lunar_Node',
    'Ascendant',
    'Medium_Coeli',
  ],
  active_aspects: ALL_ASPECTS.filter((a) => isMajorAspect(a.name)).map((a) => ({ name: a.name, orb: a.defaultOrb })),
  custom_distribution_weights: {},

  default_zodiac_system: 'Tropical',
  default_sidereal_mode: 'LAHIRI',
  house_system: 'P', // Default to Placidus code
  perspective_type: 'Apparent Geocentric', // Default to Apparent Geocentric
  rulership_mode: 'modern',
}

// Appearance Section Component
export function AppearanceSection({
  prefs,
  setPrefs,
}: {
  prefs: ChartPreferencesData
  setPrefs: React.Dispatch<React.SetStateAction<ChartPreferencesData>>
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Visual Style</CardTitle>
          <CardDescription>Control colors, language, and display preferences for your charts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Theme</Label>
              <p className="text-sm text-muted-foreground">Select the visual theme for chart rendering.</p>
              <Select value={prefs.theme} onValueChange={(val) => setPrefs((p) => ({ ...p, theme: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_THEMES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t.replace(/-/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Format</Label>
              <p className="text-sm text-muted-foreground">How dates are displayed throughout the application.</p>
              <Select
                value={prefs.date_format}
                onValueChange={(val) => setPrefs((p) => ({ ...p, date_format: val as 'US' | 'EU' | 'ISO' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EU">European (DD/MM/YYYY)</SelectItem>
                  <SelectItem value="US">American (MM/DD/YYYY)</SelectItem>
                  <SelectItem value="ISO">ISO (YYYY-MM-DD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time Format</Label>
              <p className="text-sm text-muted-foreground">How times are displayed throughout the application.</p>
              <Select
                value={prefs.time_format}
                onValueChange={(val) => setPrefs((p) => ({ ...p, time_format: val as '12h' | '24h' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 Hour (14:30)</SelectItem>
                  <SelectItem value="12h">12 Hour (2:30 PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Show Degree Indicators</Label>
              <p className="text-sm text-muted-foreground">
                Display radial lines and degree numbers for planet positions on the chart wheel.
              </p>
            </div>
            <Switch
              checked={prefs.show_degree_indicators}
              onCheckedChange={(checked) => setPrefs((p) => ({ ...p, show_degree_indicators: checked }))}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Show Aspect Icons</Label>
              <p className="text-sm text-muted-foreground">
                Display aspect symbols (conjunction, square, trine, etc.) on aspect lines.
              </p>
            </div>
            <Switch
              checked={prefs.show_aspect_icons}
              onCheckedChange={(checked) => setPrefs((p) => ({ ...p, show_aspect_icons: checked }))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Calculation Section Component
export function CalculationSection({
  prefs,
  setPrefs,
}: {
  prefs: ChartPreferencesData
  setPrefs: React.Dispatch<React.SetStateAction<ChartPreferencesData>>
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Zodiac System</CardTitle>
          <CardDescription>Choose the zodiac calculation system and reference frame.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Zodiac System</Label>
              <p className="text-sm text-muted-foreground">
                Tropical (Western astrology) or Sidereal (Vedic/Eastern astrology).
              </p>
              <Select
                value={prefs.default_zodiac_system}
                onValueChange={(val) => setPrefs((p) => ({ ...p, default_zodiac_system: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ZODIAC_SYSTEMS.map((sys) => (
                    <SelectItem key={sys.value} value={sys.value}>
                      {sys.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {prefs.default_zodiac_system === 'Sidereal' && (
              <div className="space-y-2">
                <Label>Sidereal Mode (Ayanamsa)</Label>
                <p className="text-sm text-muted-foreground">
                  The specific ayanamsa (precession offset) used for Sidereal calculations.
                </p>
                <Select
                  value={prefs.default_sidereal_mode}
                  onValueChange={(val) => setPrefs((p) => ({ ...p, default_sidereal_mode: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIDEREAL_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rulership System</CardTitle>
          <CardDescription>Select the system used for determining sign rulerships.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Rulership Mode</Label>
            <p className="text-sm text-muted-foreground">
              Classical (Mars rules Scorpio) or Modern (Pluto rules Scorpio).
            </p>
            <Select
              value={prefs.rulership_mode || 'modern'}
              onValueChange={(val) => setPrefs((p) => ({ ...p, rulership_mode: val as 'classical' | 'modern' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classical">Classical (Traditional)</SelectItem>
                <SelectItem value="modern">Modern</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>House System & Perspective</CardTitle>
          <CardDescription>Define how houses are calculated and the observational perspective.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>House System</Label>
              <p className="text-sm text-muted-foreground">
                The mathematical method used to divide the chart into houses.
              </p>
              <Select
                value={prefs.house_system}
                onValueChange={(val) => setPrefs((p) => ({ ...p, house_system: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUSE_SYSTEMS.map((sys) => (
                    <SelectItem key={sys.value} value={sys.value}>
                      {sys.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Perspective Type</Label>
              <p className="text-sm text-muted-foreground">
                Geocentric (Earth-centered) or Heliocentric (Sun-centered) planetary positions.
              </p>
              <Select
                value={prefs.perspective_type}
                onValueChange={(val) => setPrefs((p) => ({ ...p, perspective_type: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERSPECTIVE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Points & Aspects Section Component
export function PointsAspectsSection({
  prefs,
  setPrefs,
}: {
  prefs: ChartPreferencesData
  setPrefs: React.Dispatch<React.SetStateAction<ChartPreferencesData>>
}) {
  const handleAspectToggle = (aspectName: string, checked: boolean) => {
    setPrefs((prev) => {
      const currentAspects = prev.active_aspects || []
      if (checked) {
        // Add with default orb if not exists
        if (!currentAspects.find((a) => a.name === aspectName)) {
          const defaultOrb = ALL_ASPECTS.find((a) => a.name === aspectName)?.defaultOrb || 5
          return { ...prev, active_aspects: [...currentAspects, { name: aspectName, orb: defaultOrb }] }
        }
        return prev
      } else {
        // Remove
        return { ...prev, active_aspects: currentAspects.filter((a) => a.name !== aspectName) }
      }
    })
  }

  const handleAspectOrbChange = (aspectName: string, orb: number) => {
    setPrefs((prev) => {
      const currentAspects = prev.active_aspects || []
      return {
        ...prev,
        active_aspects: currentAspects.map((a) => (a.name === aspectName ? { ...a, orb } : a)),
      }
    })
  }

  const handleWeightChange = (point: string, weight: number) => {
    setPrefs((prev) => ({
      ...prev,
      custom_distribution_weights: {
        ...prev.custom_distribution_weights,
        [point]: weight,
      },
    }))
  }

  return (
    <div className="space-y-6">
      {/* Active Points */}
      <Card>
        <CardHeader>
          <CardTitle>Active Celestial Points</CardTitle>
          <CardDescription>
            Select which celestial bodies and chart points to include in your astrological calculations. Deselected
            points will be excluded from all charts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-start gap-2">
            <div className="flex items-center rounded-md border p-1 gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setPrefs((p) => ({ ...p, active_points: [...ALL_CELESTIAL_POINTS] }))
                }}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setPrefs((p) => ({ ...p, active_points: ['Sun', 'Moon'] }))
                  toast.info('Sun and Moon kept as minimum active points', {
                    description: 'At least two points must be active to avoid default API behavior.',
                  })
                }}
              >
                Deselect All
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => {
                setPrefs((p) => ({
                  ...p,
                  active_points: DEFAULT_PREFERENCES.active_points,
                  active_aspects: DEFAULT_PREFERENCES.active_aspects,
                }))
                toast.success('Restored to defaults', {
                  description: 'Active points and aspects have been reset.',
                })
              }}
            >
              Reset to Default
            </Button>
          </div>

          {/* Traditional Planets */}
          <div className="space-y-3 border rounded-lg p-4">
            <h4 className="font-semibold text-sm">Traditional Planets</h4>
            <p className="text-xs text-muted-foreground">The primary celestial bodies in classical astrology.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].map(
                (point) => (
                  <div key={point} className="flex items-center space-x-2">
                    <Checkbox
                      id={`point-${point}`}
                      checked={prefs.active_points.includes(point)}
                      onCheckedChange={(checked) => {
                        setPrefs((p) => {
                          const current = p.active_points
                          let newPoints = [...current]
                          if (checked) {
                            if (!newPoints.includes(point)) newPoints.push(point)
                          } else {
                            newPoints = newPoints.filter((x) => x !== point)
                            if (newPoints.length < 2) {
                              newPoints = ['Sun', 'Moon']
                              toast.info('Sun and Moon kept as minimum active points', {
                                description: 'At least two points must be active.',
                              })
                            }
                          }
                          return { ...p, active_points: newPoints }
                        })
                      }}
                    />
                    <label
                      htmlFor={`point-${point}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {point}
                    </label>
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Lunar Nodes */}
          <div className="space-y-3 border rounded-lg p-4">
            <h4 className="font-semibold text-sm">Lunar Nodes</h4>
            <p className="text-xs text-muted-foreground">Points where the Moon's orbit intersects the ecliptic.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['Mean_North_Lunar_Node', 'True_North_Lunar_Node', 'Mean_South_Lunar_Node', 'True_South_Lunar_Node'].map(
                (point) => (
                  <div key={point} className="flex items-center space-x-2">
                    <Checkbox
                      id={`point-${point}`}
                      checked={prefs.active_points.includes(point)}
                      onCheckedChange={(checked) => {
                        setPrefs((p) => {
                          const current = p.active_points
                          let newPoints = [...current]
                          if (checked) {
                            if (!newPoints.includes(point)) newPoints.push(point)
                          } else {
                            newPoints = newPoints.filter((x) => x !== point)
                            if (newPoints.length < 2) {
                              newPoints = ['Sun', 'Moon']
                              toast.info('Sun and Moon kept as minimum active points', {
                                description: 'At least two points must be active.',
                              })
                            }
                          }
                          return { ...p, active_points: newPoints }
                        })
                      }}
                    />
                    <label
                      htmlFor={`point-${point}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {(() => {
                        const formatLabel = (p: string) => {
                          if (p === 'True_North_Lunar_Node') return 'North Node (True)'
                          if (p === 'True_South_Lunar_Node') return 'South Node (True)'
                          if (p === 'Mean_North_Lunar_Node') return 'North Node (Mean)'
                          if (p === 'Mean_South_Lunar_Node') return 'South Node (Mean)'
                          return p.replace(/_/g, ' ')
                        }
                        return formatLabel(point)
                      })()}
                    </label>
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Centaurs & Minor Bodies */}
          <div className="space-y-3 border rounded-lg p-4">
            <h4 className="font-semibold text-sm">Centaurs & Minor Bodies</h4>
            <p className="text-xs text-muted-foreground">Chiron, Pholus, and Lilith (Black Moon).</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['Chiron', 'Pholus', 'Mean_Lilith', 'True_Lilith'].map((point) => (
                <div key={point} className="flex items-center space-x-2">
                  <Checkbox
                    id={`point-${point}`}
                    checked={prefs.active_points.includes(point)}
                    onCheckedChange={(checked) => {
                      setPrefs((p) => {
                        const current = p.active_points
                        let newPoints = [...current]
                        if (checked) {
                          if (!newPoints.includes(point)) newPoints.push(point)
                        } else {
                          newPoints = newPoints.filter((x) => x !== point)
                          if (newPoints.length < 2) {
                            newPoints = ['Sun', 'Moon']
                            toast.info('Sun and Moon kept as minimum active points', {
                              description: 'At least two points must be active.',
                            })
                          }
                        }
                        return { ...p, active_points: newPoints }
                      })
                    }}
                  />
                  <label
                    htmlFor={`point-${point}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {point.replace(/_/g, ' ')}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Asteroids */}
          <div className="space-y-3 border rounded-lg p-4">
            <h4 className="font-semibold text-sm">Asteroids</h4>
            <p className="text-xs text-muted-foreground">Major asteroids in the asteroid belt and beyond.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {['Ceres', 'Pallas', 'Juno', 'Vesta', 'Eris'].map((point) => (
                <div key={point} className="flex items-center space-x-2">
                  <Checkbox
                    id={`point-${point}`}
                    checked={prefs.active_points.includes(point)}
                    onCheckedChange={(checked) => {
                      setPrefs((p) => {
                        const current = p.active_points
                        let newPoints = [...current]
                        if (checked) {
                          if (!newPoints.includes(point)) newPoints.push(point)
                        } else {
                          newPoints = newPoints.filter((x) => x !== point)
                          if (newPoints.length < 2) {
                            newPoints = ['Sun', 'Moon']
                            toast.info('Sun and Moon kept as minimum active points', {
                              description: 'At least two points must be active.',
                            })
                          }
                        }
                        return { ...p, active_points: newPoints }
                      })
                    }}
                  />
                  <label
                    htmlFor={`point-${point}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {point}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Trans-Neptunian Objects */}
          <div className="space-y-3 border rounded-lg p-4">
            <h4 className="font-semibold text-sm">Trans-Neptunian Objects</h4>
            <p className="text-xs text-muted-foreground">Distant objects beyond Neptune's orbit.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {['Sedna', 'Haumea', 'Makemake', 'Ixion', 'Orcus', 'Quaoar'].map((point) => (
                <div key={point} className="flex items-center space-x-2">
                  <Checkbox
                    id={`point-${point}`}
                    checked={prefs.active_points.includes(point)}
                    onCheckedChange={(checked) => {
                      setPrefs((p) => {
                        const current = p.active_points
                        let newPoints = [...current]
                        if (checked) {
                          if (!newPoints.includes(point)) newPoints.push(point)
                        } else {
                          newPoints = newPoints.filter((x) => x !== point)
                          if (newPoints.length < 2) {
                            newPoints = ['Sun', 'Moon']
                            toast.info('Sun and Moon kept as minimum active points', {
                              description: 'At least two points must be active.',
                            })
                          }
                        }
                        return { ...p, active_points: newPoints }
                      })
                    }}
                  />
                  <label
                    htmlFor={`point-${point}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {point}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Fixed Stars */}
          <div className="space-y-3 border rounded-lg p-4">
            <h4 className="font-semibold text-sm">Fixed Stars</h4>
            <p className="text-xs text-muted-foreground">Important fixed stars used in astrological analysis.</p>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
              {['Regulus', 'Spica'].map((point) => (
                <div key={point} className="flex items-center space-x-2">
                  <Checkbox
                    id={`point-${point}`}
                    checked={prefs.active_points.includes(point)}
                    onCheckedChange={(checked) => {
                      setPrefs((p) => {
                        const current = p.active_points
                        let newPoints = [...current]
                        if (checked) {
                          if (!newPoints.includes(point)) newPoints.push(point)
                        } else {
                          newPoints = newPoints.filter((x) => x !== point)
                          if (newPoints.length < 2) {
                            newPoints = ['Sun', 'Moon']
                            toast.info('Sun and Moon kept as minimum active points', {
                              description: 'At least two points must be active.',
                            })
                          }
                        }
                        return { ...p, active_points: newPoints }
                      })
                    }}
                  />
                  <label
                    htmlFor={`point-${point}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {point}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Arabic Parts */}
          <div className="space-y-3 border rounded-lg p-4">
            <h4 className="font-semibold text-sm">Arabic Parts</h4>
            <p className="text-xs text-muted-foreground">Calculated points based on planetary positions.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['Pars_Fortunae', 'Pars_Spiritus', 'Pars_Amoris', 'Pars_Fidei'].map((point) => (
                <div key={point} className="flex items-center space-x-2">
                  <Checkbox
                    id={`point-${point}`}
                    checked={prefs.active_points.includes(point)}
                    onCheckedChange={(checked) => {
                      setPrefs((p) => {
                        const current = p.active_points
                        let newPoints = [...current]
                        if (checked) {
                          if (!newPoints.includes(point)) newPoints.push(point)
                        } else {
                          newPoints = newPoints.filter((x) => x !== point)
                          if (newPoints.length < 2) {
                            newPoints = ['Sun', 'Moon']
                            toast.info('Sun and Moon kept as minimum active points', {
                              description: 'At least two points must be active.',
                            })
                          }
                        }
                        return { ...p, active_points: newPoints }
                      })
                    }}
                  />
                  <label
                    htmlFor={`point-${point}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {point.replace(/_/g, ' ')}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Chart Angles & Other Points */}
          <div className="space-y-3 border rounded-lg p-4">
            <h4 className="font-semibold text-sm">Chart Angles & Special Points</h4>
            <p className="text-xs text-muted-foreground">Angles of the chart and other calculated points.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {['Ascendant', 'Medium_Coeli', 'Descendant', 'Imum_Coeli', 'Vertex', 'Anti_Vertex', 'Earth'].map(
                (point) => (
                  <div key={point} className="flex items-center space-x-2">
                    <Checkbox
                      id={`point-${point}`}
                      checked={prefs.active_points.includes(point)}
                      onCheckedChange={(checked) => {
                        setPrefs((p) => {
                          const current = p.active_points
                          let newPoints = [...current]
                          if (checked) {
                            if (!newPoints.includes(point)) newPoints.push(point)
                          } else {
                            newPoints = newPoints.filter((x) => x !== point)
                          }
                          return { ...p, active_points: newPoints }
                        })
                      }}
                    />
                    <label
                      htmlFor={`point-${point}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {point.replace(/_/g, ' ')}
                    </label>
                  </div>
                ),
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Aspects */}
      <Card>
        <CardHeader>
          <CardTitle>Active Aspects</CardTitle>
          <CardDescription>
            Define which aspects to calculate between celestial points and set their orb tolerances (in degrees).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ALL_ASPECTS.map((aspect) => {
              const isActive = !!prefs.active_aspects?.find((a) => a.name === aspect.name)
              const currentOrb = prefs.active_aspects?.find((a) => a.name === aspect.name)?.orb ?? aspect.defaultOrb

              return (
                <div key={aspect.name} className="flex items-center justify-between space-x-4 border p-3 rounded-md">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`aspect-${aspect.name}`}
                      checked={isActive}
                      onCheckedChange={(checked) => handleAspectToggle(aspect.name, checked as boolean)}
                    />
                    <label htmlFor={`aspect-${aspect.name}`} className="text-sm font-medium leading-none capitalize">
                      {aspect.name}
                    </label>
                  </div>
                  {isActive && (
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`orb-${aspect.name}`} className="text-xs text-muted-foreground">
                        Orb (°)
                      </Label>
                      <Input
                        id={`orb-${aspect.name}`}
                        type="number"
                        step="0.5"
                        className="w-20 h-8"
                        value={currentOrb}
                        onChange={(e) => handleAspectOrbChange(aspect.name, parseFloat(e.target.value))}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Distribution & Weights */}
      <Card>
        <CardHeader>
          <CardTitle>Distribution & Weights</CardTitle>
          <CardDescription>
            Control how planetary influences are weighted when calculating element and modality distributions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Distribution Method</Label>
            <p className="text-sm text-muted-foreground">
              Choose between weighted (traditional astrological importance) or pure count (equal weight for all points).
            </p>
            <Select
              value={prefs.distribution_method}
              onValueChange={(val) => setPrefs((p) => ({ ...p, distribution_method: val }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weighted">Weighted (Traditional)</SelectItem>
                <SelectItem value="pure_count">Pure Count (Equal Weight)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {prefs.distribution_method === 'weighted' && (
            <div className="space-y-4 pt-2">
              <div>
                <Label>Custom Weights</Label>
                <p className="text-sm text-muted-foreground">
                  Fine-tune the relative importance of each planet and angle. Higher values = greater influence.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {ALL_CELESTIAL_POINTS.filter((p: string) =>
                  // Only show traditional planets and angles for distribution weights
                  [
                    'Sun',
                    'Moon',
                    'Mercury',
                    'Venus',
                    'Mars',
                    'Jupiter',
                    'Saturn',
                    'Uranus',
                    'Neptune',
                    'Pluto',
                    'Ascendant',
                    'Medium_Coeli',
                    'Descendant',
                    'Imum_Coeli',
                  ].includes(p),
                ).map((point) => (
                  <div key={point} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{point.replace(/_/g, ' ')}</Label>
                    <Input
                      type="number"
                      step="0.5"
                      className="h-8"
                      value={prefs.custom_distribution_weights?.[point.toLowerCase()] ?? getDefaultWeight(point)}
                      onChange={(e) => handleWeightChange(point.toLowerCase(), parseFloat(e.target.value))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function getDefaultWeight(point: string): number {
  const p = point.toLowerCase()
  if (['sun', 'moon', 'ascendant'].includes(p)) return 2
  if (['mercury', 'venus', 'mars', 'medium_coeli'].includes(p)) return 1.5
  return 1
}
