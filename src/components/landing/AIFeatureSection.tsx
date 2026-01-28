'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { useScrollAnimation } from './useScrollAnimation'

// Streaming text component
function StreamingInterpretation({ isVisible }: { isVisible: boolean }) {
  const [displayedChars, setDisplayedChars] = useState(0)

  const fullText = `## ☉ Sun in Leo in the 5th House

Your **Sun placement** reveals your core identity and life purpose.

### 🌟 Key Themes
The Sun in Leo shines brightly in its home sign, giving you a natural **charisma** and creative self-expression. In the 5th house, this placement emphasizes:

• **Creative talent** and artistic expression
• A love for **romance** and dramatic gestures  
• Strong connection with **children** and play
• Natural **leadership** in creative endeavors

### 💫 Life Path
You are here to express your unique **creative vision** and inspire others through your authentic self-expression...`

  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      setDisplayedChars((prev) => {
        if (prev >= fullText.length) {
          clearInterval(interval)
          return prev
        }
        return prev + 2
      })
    }, 20)

    return () => clearInterval(interval)
  }, [isVisible, fullText.length])

  const visibleText = fullText.slice(0, displayedChars)

  // Simple markdown-like rendering
  const renderText = (text: string) => {
    return text.split('\n').map((line, i) => {
      // H2 headers
      if (line.startsWith('## ')) {
        return (
          <h3 key={i} className="mb-3 mt-4 text-lg font-bold text-foreground first:mt-0">
            {line.slice(3)}
          </h3>
        )
      }
      // H3 headers
      if (line.startsWith('### ')) {
        return (
          <h4 key={i} className="mb-2 mt-4 font-semibold text-foreground">
            {line.slice(4)}
          </h4>
        )
      }
      // Bullet points
      if (line.startsWith('• ')) {
        const content = line
          .slice(2)
          .split('**')
          .map((part, j) =>
            j % 2 === 1 ? (
              <strong key={j} className="font-semibold">
                {part}
              </strong>
            ) : (
              part
            ),
          )
        return (
          <p key={i} className="mb-1 ml-4 text-sm text-foreground">
            • {content}
          </p>
        )
      }
      // Regular paragraphs with bold
      if (line.trim()) {
        const content = line.split('**').map((part, j) =>
          j % 2 === 1 ? (
            <strong key={j} className="font-semibold">
              {part}
            </strong>
          ) : (
            part
          ),
        )
        return (
          <p key={i} className="mb-2 text-sm text-muted-foreground">
            {content}
          </p>
        )
      }
      return <br key={i} />
    })
  }

  return (
    <div className="font-mono text-sm leading-relaxed">
      {renderText(visibleText)}
      {displayedChars < fullText.length && <span className="inline-block h-4 w-2 animate-pulse bg-foreground" />}
    </div>
  )
}

export function AIFeatureSection() {
  const { sectionRef, isVisible } = useScrollAnimation()

  return (
    <section ref={sectionRef} className="relative z-10 bg-muted/50 px-4 py-20 backdrop-blur-md">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Content - left side */}
          <div className={isVisible ? 'animate-on-scroll visible' : 'animate-on-scroll'}>
            <Badge variant="secondary" className="mb-4">
              AI Interpretations
            </Badge>
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Instant Insights,
              <span className="gradient-text-subtle"> Powered by AI</span>
            </h2>
            <p className="mb-6 text-muted-foreground">
              Get intelligent, context-aware interpretations for any chart. Rich formatted text with emojis, headings,
              and structured analysis delivered in real-time.
            </p>
            <ul className="list-disc list-outside space-y-3 pl-5">
              {[
                'Full chart analysis with key themes',
                'Structured sections with headings',
                'Real-time streaming text generation',
                'Works with all chart types',
              ].map((item) => (
                <li key={item} className="text-sm text-foreground">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* AI Notepad Mockup - right side */}
          <div
            className={`relative rounded-xl overflow-hidden shadow-2xl border border-border/50 bg-background/50 ${isVisible ? 'animate-on-scroll visible stagger-2' : 'animate-on-scroll'}`}
          >
            <div className="h-[400px] overflow-hidden p-6">
              <StreamingInterpretation isVisible={isVisible} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
