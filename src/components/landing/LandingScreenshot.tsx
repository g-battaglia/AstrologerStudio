'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ZoomIn, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

interface LandingScreenshotProps {
  src: string
  alt: string
  aspectRatio?: string
  priority?: boolean
  className?: string
}

export function LandingScreenshot({
  src,
  alt,
  aspectRatio = '16/9',
  priority = false,
  className = '',
}: LandingScreenshotProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div
          className={`group relative cursor-zoom-in overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-2xl transition-all duration-500 hover:scale-[1.02] ${className}`}
          style={{ aspectRatio, minHeight: 'unset' }}
        >
          {/* Permanent Glow Effect */}
          <div className="absolute -inset-4 z-0 bg-primary/20 blur-2xl transition-all duration-500 group-hover:bg-primary/30 group-hover:blur-3xl" />

          {/* Image Container */}
          <div className="relative z-10 size-full overflow-hidden rounded-xl">
            <Image
              src={src}
              alt={alt}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority={priority}
            />

            {/* Hover Overlay with Icon */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[2px] transition-all duration-300 group-hover:opacity-100">
              <div className="flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur-md">
                <ZoomIn className="size-4" />
                <span>Zoom</span>
              </div>
            </div>
          </div>
        </div>
      </DialogTrigger>

      <DialogContent
        className="max-w-[95vw] border-none bg-transparent p-0 shadow-none sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[1200px]"
        showCloseButton={false}
      >
        <VisuallyHidden>
          <DialogTitle>{alt}</DialogTitle>
        </VisuallyHidden>
        <div className="relative flex flex-col overflow-hidden rounded-lg shadow-2xl ring-1 ring-border/50 bg-background">
          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-2 text-foreground shadow-md transition-colors hover:bg-background"
          >
            <X className="size-5" />
            <span className="sr-only">Close</span>
          </button>

          <div className="relative aspect-video w-full bg-background/95 backdrop-blur-sm">
            <Image src={src} alt={alt} fill className="object-contain" priority />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
