'use client'

import { useState } from 'react'
import { ImageIcon, Eye } from 'lucide-react'
// import { Upload, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
// import { toast } from 'sonner'
import { usePDFBranding, type BrandingType } from '@/stores/pdfBrandingStore'

/**
 * PDF Branding Settings Panel
 *
 * Allows users to configure their PDF export branding:
 * - Default (AstrologerStudio)
 * - Custom text
 * - Custom logo upload
 */
export function PDFBrandingSettings() {
  // const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewMode, setPreviewMode] = useState(false)

  const {
    brandingType,
    logoData,
    brandingText,
    showFooter,
    footerText,
    setBrandingType,
    // setLogoData,
    setBrandingText,
    setShowFooter,
    setFooterText,
    resetToDefaults,
  } = usePDFBranding()

  /* const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file')
        return
      }

      // Validate file size (max 500KB for localStorage)
      if (file.size > 500 * 1024) {
        toast.error('Image must be smaller than 500KB')
        return
      }

      // Read file as base64
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setLogoData(result)
        setBrandingType('logo')
        toast.success('Logo uploaded successfully')
      }
      reader.onerror = () => {
        toast.error('Failed to read image file')
      }
      reader.readAsDataURL(file)
    },
    [setLogoData, setBrandingType],
  )

  const handleRemoveLogo = () => {
    setLogoData(null)
    if (brandingType === 'logo') {
      setBrandingType('default')
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    toast.success('Logo removed')
  } */

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          PDF Branding
        </CardTitle>
        <CardDescription>Customize the branding that appears on your exported PDF reports.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Branding Type Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Branding Style</Label>
          <RadioGroup
            value={brandingType}
            onValueChange={(value) => setBrandingType(value as BrandingType)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="default" id="branding-default" />
              <Label htmlFor="branding-default" className="cursor-pointer">
                Default (AstrologerStudio)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="text" id="branding-text" />
              <Label htmlFor="branding-text" className="cursor-pointer">
                Brand / Business Name
              </Label>
            </div>
            {/* <div className="flex items-center space-x-2">
              <RadioGroupItem value="logo" id="branding-logo" />
              <Label htmlFor="branding-logo" className="cursor-pointer">
                Custom Logo
              </Label>
            </div> */}
          </RadioGroup>
        </div>

        {/* Custom Text Input */}
        {brandingType === 'text' && (
          <div className="space-y-2">
            <Label htmlFor="branding-text-input">Brand / Business Name</Label>
            <Input
              id="branding-text-input"
              placeholder="Your name or studio name"
              value={brandingText}
              onChange={(e) => setBrandingText(e.target.value)}
              className="max-w-sm"
            />
            <p className="text-xs text-muted-foreground">This text will appear in the PDF header.</p>
          </div>
        )}

        {/* Logo Upload */}
        {/* Logo Upload - DISABLED
        {brandingType === 'logo' && (
          <div className="space-y-3">
            <Label>Logo Image</Label>

            {logoData ? (
              <div className="flex items-start gap-4">
                <div className="border rounded-md p-2 bg-muted/30">
                  <img src={logoData} alt="Logo preview" className="h-12 w-auto max-w-[160px] object-contain" />
                </div>
                <Button variant="outline" size="sm" onClick={handleRemoveLogo}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logo
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Recommended: PNG or SVG with transparent background. Max size: 500KB.
            </p>
          </div>
        )} */}

        {/* Footer Settings */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-footer">Show Footer</Label>
              <p className="text-xs text-muted-foreground">Display footer with generation date on PDF pages.</p>
            </div>
            <Switch id="show-footer" checked={showFooter} onCheckedChange={setShowFooter} />
          </div>

          {showFooter && (
            <div className="space-y-2">
              <Label htmlFor="footer-text-input">Custom Footer Text</Label>
              <Input
                id="footer-text-input"
                placeholder="Generated by AstrologerStudio"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="max-w-sm"
              />
              <p className="text-xs text-muted-foreground">Leave empty to use default text.</p>
            </div>
          )}
        </div>

        {/* Preview Section */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <Label>Preview</Label>
            <Button variant="ghost" size="sm" onClick={() => setPreviewMode(!previewMode)}>
              <Eye className="h-4 w-4 mr-1" />
              {previewMode ? 'Hide Preview' : 'Show Preview'}
            </Button>
          </div>

          {previewMode && (
            <div className="border rounded-md p-4 bg-white">
              <div className="flex items-center justify-between border-b pb-2 mb-4">
                <div>
                  {brandingType === 'logo' && logoData ? (
                    <img src={logoData} alt="Logo" className="h-8 w-auto max-w-[100px] object-contain" />
                  ) : (
                    <span className="font-serif text-sm font-semibold text-[#2c3e50]">
                      {brandingType === 'text' && brandingText ? brandingText : 'AstrologerStudio'}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-serif text-xs text-[#2c3e50]">Natal Chart Report</span>
                </div>
              </div>
              <div className="text-center text-xs text-muted-foreground">[PDF Content Preview]</div>
              {showFooter && (
                <div className="flex items-center justify-between border-t pt-2 mt-4 text-[10px] text-muted-foreground">
                  <span>{footerText || 'Generated by AstrologerStudio'}</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reset Button */}
        <div className="pt-4 border-t">
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
