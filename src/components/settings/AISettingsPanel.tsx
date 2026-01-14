'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  useAIInterpretation,
  LANGUAGE_NAMES,
  type AstrologicalSchool,
  type InterpretationLanguage,
} from '@/stores/aiInterpretationSettings'
import { ASTROLOGICAL_SCHOOL_PROMPTS } from '@/lib/ai/prompts'
import { Sparkles, Info } from 'lucide-react'

const SCHOOL_DESCRIPTIONS: Record<AstrologicalSchool, string> = {
  modern: 'Contemporary psychological approach focusing on personal growth and empowerment',
  traditional: 'Classical techniques with essential dignities, traditional rulerships, and sect',
  psychological: 'Jungian archetypes, shadow work, and depth psychology integration',
  evolutionary: "Soul's journey, karmic patterns, and spiritual evolution",
  vedic: 'Hindu astrology with nakshatras, dashas, and traditional Vedic wisdom',
  custom: 'Define your own interpretation style and approach',
}

// Check if custom prompts feature is enabled
const customPromptsEnabled = process.env.NEXT_PUBLIC_ENABLE_CUSTOM_AI_PROMPTS === 'true'

export function AISettingsPanel() {
  const {
    enabled,
    selectedSchool,
    customPrompt,
    language,
    setEnabled,
    setSelectedSchool,
    setCustomPrompt,
    setLanguage,
    include_house_comparison,
    setIncludeHouseComparison,
  } = useAIInterpretation()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Interpretation Settings
          </CardTitle>
          <CardDescription>Configure AI-powered astrological interpretation for your charts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-enabled">Enable AI Interpretation</Label>
              <p className="text-sm text-muted-foreground">Show AI interpretation tab in chart views</p>
            </div>
            <Switch id="ai-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* Include house comparison in AI context */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-include-house-comparison">Include House Comparison</Label>
              <p className="text-sm text-muted-foreground">
                When available, include house comparison data in the AI interpretation context.
              </p>
            </div>
            <Switch
              id="ai-include-house-comparison"
              checked={include_house_comparison}
              onCheckedChange={setIncludeHouseComparison}
              disabled={!enabled}
            />
          </div>

          {/* Astrological School Selection */}
          <div className="space-y-3">
            <Label htmlFor="school-select">Astrological School</Label>
            <Select
              value={selectedSchool}
              onValueChange={(value) => setSelectedSchool(value as AstrologicalSchool)}
              disabled={!enabled}
            >
              <SelectTrigger id="school-select">
                <SelectValue placeholder="Select astrological school" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="traditional">Traditional</SelectItem>
                <SelectItem value="psychological">Psychological</SelectItem>
                <SelectItem value="evolutionary">Evolutionary</SelectItem>
                <SelectItem value="vedic">Vedic</SelectItem>
                {customPromptsEnabled && <SelectItem value="custom">Custom</SelectItem>}
              </SelectContent>
            </Select>
            <div className="flex items-start gap-2 rounded-md bg-muted p-3">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">{SCHOOL_DESCRIPTIONS[selectedSchool]}</p>
            </div>
          </div>

          {/* Custom Prompt (shown only when custom is selected and feature is enabled) */}
          {customPromptsEnabled && selectedSchool === 'custom' && (
            <div className="space-y-3">
              <Label htmlFor="custom-prompt">Custom Prompt</Label>
              <Textarea
                id="custom-prompt"
                placeholder="Enter your custom system prompt for AI interpretation..."
                value={customPrompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomPrompt(e.target.value)}
                rows={8}
                disabled={!enabled}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Define how the AI should interpret charts. Be specific about your approach, focus areas, and style.
              </p>
            </div>
          )}

          {/* Preview of selected prompt (for non-custom schools or when custom is disabled) */}
          {(selectedSchool !== 'custom' || !customPromptsEnabled) && (
            <div className="space-y-3">
              <Label>Prompt Preview</Label>
              <div className="rounded-md border bg-muted/50 p-4">
                <p className="text-sm font-mono whitespace-pre-wrap text-muted-foreground">
                  {ASTROLOGICAL_SCHOOL_PROMPTS[selectedSchool === 'custom' ? 'modern' : selectedSchool]}
                </p>
              </div>
            </div>
          )}

          {/* Language Selection - Moved below prompt preview */}
          <div className="space-y-3">
            <Label htmlFor="language-select">Output Language</Label>
            <Select
              value={language}
              onValueChange={(value) => setLanguage(value as InterpretationLanguage)}
              disabled={!enabled}
            >
              <SelectTrigger id="language-select">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                  <SelectItem key={code} value={code}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Language for AI-generated interpretations</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
