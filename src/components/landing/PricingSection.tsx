import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Check, Sparkles, ArrowRight, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PRICING_CONFIG } from '@/lib/config/pricing'

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section id="pricing" ref={sectionRef} className="relative z-10 px-4 py-20">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2
            className={`mb-4 text-3xl font-bold text-foreground ${isVisible ? 'animate-on-scroll visible' : 'animate-on-scroll'}`}
          >
            Simple, Transparent
            <span className="gradient-text-subtle"> Pricing</span>
          </h2>
          <p
            className={`text-lg text-muted-foreground max-w-2xl mx-auto ${isVisible ? 'animate-on-scroll visible stagger-1' : 'animate-on-scroll'}`}
          >
            One plan, everything included. No hidden fees.
          </p>
        </div>

        {/* Pricing Card */}
        <div className={`mx-auto max-w-md ${isVisible ? 'animate-on-scroll visible stagger-2' : 'animate-on-scroll'}`}>
          <div className="relative rounded-2xl border-2 border-primary/30 bg-card/80 backdrop-blur-sm p-8 shadow-lg">
            {/* Launch Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-lg">
                <Rocket className="h-4 w-4" />
                Launch Special
              </div>
            </div>

            {/* Plan Icon & Name */}
            <div className="text-center pt-4">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">Pro Plan</h3>
              <p className="text-muted-foreground mt-1">Full access to Astrologer Studio</p>
            </div>

            {/* Pricing */}
            <div className="text-center my-6">
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl text-muted-foreground line-through decoration-2">
                  ${PRICING_CONFIG.plans.pro.price}
                </span>
                <span className="text-5xl font-bold gradient-text">${PRICING_CONFIG.plans.pro.launchPrice}</span>
              </div>
              <span className="text-muted-foreground">/month</span>
              <p className="mt-2 text-sm text-primary font-medium">
                {PRICING_CONFIG.plans.pro.launchDiscountPercentage}% off — Launch price!
              </p>
            </div>

            {/* Features */}
            <ul className="space-y-3 my-6">
              {PRICING_CONFIG.features.pro.map((feature, index) => (
                <li
                  key={feature}
                  className={`flex items-center gap-3 ${isVisible ? `animate-on-scroll visible stagger-${Math.min(index + 3, 6)}` : 'animate-on-scroll'}`}
                >
                  <Check className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <Link href="/register" className="block">
              <Button
                size="lg"
                className="w-full gap-2 gradient-bg-animated"
                data-umami-event="pricing-get-started-click"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            {/* Footer note */}
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {PRICING_CONFIG.plans.pro.trialDays}-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
