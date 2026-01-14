'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Loader2, RefreshCw } from 'lucide-react'
import {
  getNatalChart,
  getSynastryChart,
  getTransitChart,
  getCompositeChart,
  getSolarReturnChart,
  getLunarReturnChart,
} from '@/actions/astrology'
import { usePDFBranding } from '@/stores/pdfBrandingStore'
import type { Subject } from '@/types/subjects'
import type { ChartResponse } from '@/types/astrology'

// Dynamic import of PDF components to avoid SSR issues
const PDFViewer = dynamic(() => import('@react-pdf/renderer').then((mod) => mod.PDFViewer), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[700px] bg-muted rounded-lg">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
})

// Import PDF document components
import { NatalChartPDF } from '@/components/pdf/NatalChartPDF'
import { SynastryChartPDF } from '@/components/pdf/SynastryChartPDF'
import { TransitChartPDF } from '@/components/pdf/TransitChartPDF'
import { CompositeChartPDF } from '@/components/pdf/CompositeChartPDF'
import { SolarReturnPDF } from '@/components/pdf/SolarReturnPDF'
import { LunarReturnPDF } from '@/components/pdf/LunarReturnPDF'

// Default subject for testing
const defaultSubject1: Subject = {
  id: 'dev-subject-1',
  name: 'John Doe',
  birth_datetime: '1990-06-15T14:30:00',
  city: 'Roma',
  nation: 'IT',
  latitude: 41.9028,
  longitude: 12.4964,
  timezone: 'Europe/Rome',
  ownerId: 'dev',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const defaultSubject2: Subject = {
  id: 'dev-subject-2',
  name: 'Jane Smith',
  birth_datetime: '1992-03-21T10:15:00',
  city: 'Milano',
  nation: 'IT',
  latitude: 45.4642,
  longitude: 9.19,
  timezone: 'Europe/Rome',
  ownerId: 'dev',
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Convert SVG to data URL
async function svgToDataUrl(svgHtml: string): Promise<string | null> {
  try {
    const container = document.createElement('div')
    container.innerHTML = svgHtml.trim()
    const svgElement = container.querySelector('svg')
    if (!svgElement) return null

    const width = parseInt(svgElement.getAttribute('width') || '500', 10)
    const height = parseInt(svgElement.getAttribute('height') || '500', 10)

    const canvas = document.createElement('canvas')
    canvas.width = width * 2
    canvas.height = height * 2
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.scale(2, 2)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)

    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/png', 1.0))
        URL.revokeObjectURL(svgUrl)
      }
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl)
        resolve(null)
      }
      img.src = svgUrl
    })
  } catch {
    return null
  }
}

export default function PDFDevPreviewPage() {
  const [activeTab, setActiveTab] = useState('natal')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Subject state
  const [subject1, setSubject1] = useState<Subject>(defaultSubject1)
  const [subject2, setSubject2] = useState<Subject>(defaultSubject2)

  // Chart data state
  const [natalData, setNatalData] = useState<ChartResponse | null>(null)
  const [natal2Data, setNatal2Data] = useState<ChartResponse | null>(null)
  const [synastryData, setSynastryData] = useState<ChartResponse | null>(null)
  const [transitData, setTransitData] = useState<ChartResponse | null>(null)
  const [compositeData, setCompositeData] = useState<ChartResponse | null>(null)
  const [solarReturnData, setSolarReturnData] = useState<ChartResponse | null>(null)
  const [lunarReturnData, setLunarReturnData] = useState<ChartResponse | null>(null)
  const [chartWheelImage, setChartWheelImage] = useState<string | null>(null)

  // Export options from store
  const { exportOptions, setExportOption } = usePDFBranding()

  // Local notes
  const [notes, setNotes] = useState('Sample interpretation notes for development testing.')

  // Branding
  const branding = {
    type: 'default' as const,
    logoData: null,
    text: '',
    showFooter: true,
    footerText: 'Generated with AstrologerStudio - Dev Preview',
  }

  // Fetch chart based on active tab
  const fetchChart = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setChartWheelImage(null)

    try {
      switch (activeTab) {
        case 'natal': {
          const response = await getNatalChart(subject1, { theme: 'classic' })
          setNatalData(response)
          if (response.chart_wheel) {
            const img = await svgToDataUrl(response.chart_wheel)
            setChartWheelImage(img)
          }
          break
        }
        case 'synastry': {
          const [nat1, nat2, syn] = await Promise.all([
            getNatalChart(subject1, { theme: 'classic' }),
            getNatalChart(subject2, { theme: 'classic' }),
            getSynastryChart(subject1, subject2, { theme: 'classic' }),
          ])

          setNatalData(nat1)
          setNatal2Data(nat2)
          setSynastryData(syn)

          if (syn.chart_wheel) {
            const img = await svgToDataUrl(syn.chart_wheel)
            setChartWheelImage(img)
          }
          break
        }
        case 'transit': {
          const [nat1, trans] = await Promise.all([
            getNatalChart(subject1, { theme: 'classic' }),
            getTransitChart(subject1, subject2, { theme: 'classic' }),
          ])

          setNatalData(nat1)
          setTransitData(trans)

          if (trans.chart_wheel) {
            const img = await svgToDataUrl(trans.chart_wheel)
            setChartWheelImage(img)
          }
          break
        }
        case 'composite': {
          const [nat1, nat2, comp] = await Promise.all([
            getNatalChart(subject1, { theme: 'classic' }),
            getNatalChart(subject2, { theme: 'classic' }),
            getCompositeChart(subject1, subject2, { theme: 'classic' }),
          ])

          setNatalData(nat1)
          setNatal2Data(nat2)
          setCompositeData(comp)

          if (comp.chart_wheel) {
            const img = await svgToDataUrl(comp.chart_wheel)
            setChartWheelImage(img)
          }
          break
        }
        case 'solar-return': {
          const response = await getSolarReturnChart(subject1, {
            theme: 'classic',
            year: new Date().getFullYear(),
            wheel_type: 'dual',
          })
          setSolarReturnData(response)
          if (response.chart_wheel) {
            const img = await svgToDataUrl(response.chart_wheel)
            setChartWheelImage(img)
          }
          break
        }
        case 'lunar-return': {
          const response = await getLunarReturnChart(subject1, {
            theme: 'classic',
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            wheel_type: 'dual',
          })
          setLunarReturnData(response)
          if (response.chart_wheel) {
            const img = await svgToDataUrl(response.chart_wheel)
            setChartWheelImage(img)
          }
          break
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch chart')
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, subject1, subject2])

  // Fetch on mount and tab change
  useEffect(() => {
    fetchChart()
  }, [fetchChart])

  // Render export options switches
  const renderExportOptions = () => (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Export Options</h4>

      <div className="flex items-center justify-between">
        <Label htmlFor="include-chart" className="cursor-pointer text-sm">
          Chart Wheel
        </Label>
        <Switch
          id="include-chart"
          checked={exportOptions.includeChartWheel}
          onCheckedChange={(checked) => setExportOption('includeChartWheel', checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="include-planets" className="cursor-pointer text-sm">
          Planetary Positions
        </Label>
        <Switch
          id="include-planets"
          checked={exportOptions.includePlanets}
          onCheckedChange={(checked) => setExportOption('includePlanets', checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="include-houses" className="cursor-pointer text-sm">
          House Cusps
        </Label>
        <Switch
          id="include-houses"
          checked={exportOptions.includeHouses}
          onCheckedChange={(checked) => setExportOption('includeHouses', checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="include-aspects" className="cursor-pointer text-sm">
          Aspects
        </Label>
        <Switch
          id="include-aspects"
          checked={exportOptions.includeAspects}
          onCheckedChange={(checked) => setExportOption('includeAspects', checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="include-interp" className="cursor-pointer text-sm">
          Interpretation
        </Label>
        <Switch
          id="include-interp"
          checked={exportOptions.includeInterpretation}
          onCheckedChange={(checked) => setExportOption('includeInterpretation', checked)}
        />
      </div>

      {activeTab === 'synastry' && (
        <div className="flex items-center justify-between">
          <Label htmlFor="include-rscore" className="cursor-pointer text-sm">
            Relationship Score
          </Label>
          <Switch
            id="include-rscore"
            checked={exportOptions.includeRelationshipScore}
            onCheckedChange={(checked) => setExportOption('includeRelationshipScore', checked)}
          />
        </div>
      )}
    </div>
  )

  // Render subject editor
  const renderSubjectEditor = (subject: Subject, setSubject: (s: Subject) => void, label: string) => (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{label}</h4>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Name</Label>
          <Input
            value={subject.name}
            onChange={(e) => setSubject({ ...subject, name: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">City</Label>
          <Input
            value={subject.city}
            onChange={(e) => setSubject({ ...subject, city: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Birth Datetime</Label>
          <Input
            type="datetime-local"
            value={subject.birth_datetime.slice(0, 16)}
            onChange={(e) => setSubject({ ...subject, birth_datetime: e.target.value + ':00' })}
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
  )

  // Render PDF content
  const renderPDFContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-[700px] bg-muted rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-[700px] bg-destructive/10 rounded-lg">
          <p className="text-destructive">{error}</p>
        </div>
      )
    }

    const notesToUse = exportOptions.includeInterpretation ? notes : undefined

    switch (activeTab) {
      case 'natal':
        if (!natalData) return null
        return (
          <PDFViewer width="100%" height={700} showToolbar>
            <NatalChartPDF
              chartData={natalData.chart_data}
              aspects={natalData.chart_data.aspects}
              chartWheelImage={chartWheelImage}
              notes={notesToUse}
              branding={branding}
              options={exportOptions}
              dateFormat="EU"
              timeFormat="24h"
            />
          </PDFViewer>
        )

      case 'synastry':
        if (!synastryData || !natalData || !natal2Data) return null
        return (
          <PDFViewer width="100%" height={700} showToolbar>
            <SynastryChartPDF
              chartData={synastryData.chart_data}
              subject1ChartData={natalData.chart_data}
              subject2ChartData={natal2Data.chart_data}
              aspects={synastryData.chart_data.aspects}
              chartWheelImage={chartWheelImage}
              notes={notesToUse}
              branding={branding}
              options={exportOptions}
              dateFormat="EU"
              timeFormat="24h"
            />
          </PDFViewer>
        )

      case 'transit':
        if (!transitData || !natalData) return null
        return (
          <PDFViewer width="100%" height={700} showToolbar>
            <TransitChartPDF
              chartData={transitData.chart_data}
              natalChartData={natalData.chart_data}
              transitChartData={transitData.chart_data}
              aspects={transitData.chart_data.aspects}
              chartWheelImage={chartWheelImage}
              notes={notesToUse}
              branding={branding}
              options={exportOptions}
              dateFormat="EU"
              timeFormat="24h"
            />
          </PDFViewer>
        )

      case 'composite':
        if (!compositeData) return null
        return (
          <PDFViewer width="100%" height={700} showToolbar>
            <CompositeChartPDF
              chartData={compositeData.chart_data}
              firstSubject={compositeData.chart_data.first_subject!}
              secondSubject={compositeData.chart_data.second_subject!}
              aspects={compositeData.chart_data.aspects}
              chartWheelImage={chartWheelImage}
              notes={notesToUse}
              branding={branding}
              options={exportOptions}
              dateFormat="EU"
              timeFormat="24h"
            />
          </PDFViewer>
        )

      case 'solar-return':
        if (!solarReturnData) return null
        return (
          <PDFViewer width="100%" height={700} showToolbar>
            <SolarReturnPDF
              chartData={solarReturnData.chart_data}
              aspects={solarReturnData.chart_data.aspects}
              chartWheelImage={chartWheelImage}
              notes={notesToUse}
              isDualWheel={true}
              branding={branding}
              options={exportOptions}
              dateFormat="EU"
              timeFormat="24h"
            />
          </PDFViewer>
        )

      case 'lunar-return':
        if (!lunarReturnData) return null
        return (
          <PDFViewer width="100%" height={700} showToolbar>
            <LunarReturnPDF
              chartData={lunarReturnData.chart_data}
              aspects={lunarReturnData.chart_data.aspects}
              chartWheelImage={chartWheelImage}
              notes={notesToUse}
              isDualWheel={true}
              branding={branding}
              options={exportOptions}
              dateFormat="EU"
              timeFormat="24h"
            />
          </PDFViewer>
        )

      default:
        return null
    }
  }

  return (
    <div className="mx-auto py-6 space-y-4 max-w-7xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">PDF Dev Preview</h1>
          <p className="text-sm text-muted-foreground">Real-time PDF preview with live API data</p>
        </div>
        <Button onClick={fetchChart} variant="outline" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Settings Panel */}
        <Card className="lg:col-span-1">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Settings</CardTitle>
            <CardDescription className="text-xs">Configure subjects and options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {renderSubjectEditor(subject1, setSubject1, 'Subject 1')}

            {(activeTab === 'synastry' || activeTab === 'transit' || activeTab === 'composite') && (
              <>
                <Separator />
                {renderSubjectEditor(subject2, setSubject2, 'Subject 2')}
              </>
            )}

            <Separator />
            {renderExportOptions()}

            <Separator />
            <div className="space-y-2">
              <Label className="text-sm">Notes</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-20 text-xs p-2 border rounded-md resize-none"
                placeholder="Interpretation notes..."
              />
            </div>
          </CardContent>
        </Card>

        {/* PDF Preview */}
        <Card className="lg:col-span-4 overflow-visible">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Preview</CardTitle>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="natal">Natal</TabsTrigger>
                  <TabsTrigger value="synastry">Synastry</TabsTrigger>
                  <TabsTrigger value="transit">Transit</TabsTrigger>
                  <TabsTrigger value="composite">Composite</TabsTrigger>
                  <TabsTrigger value="solar-return">Solar</TabsTrigger>
                  <TabsTrigger value="lunar-return">Lunar</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="w-full min-h-[700px]" style={{ position: 'relative' }}>
              {renderPDFContent()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
