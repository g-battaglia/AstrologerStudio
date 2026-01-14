'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const steps = [
  {
    number: 1,
    title: 'Create Your Account',
    description: 'Sign up in seconds and set up your astrology preferences.',
  },
  {
    number: 2,
    title: 'Add Your Subjects',
    description: 'Enter birth data for clients, friends, or personal study.',
  },
  {
    number: 3,
    title: 'Generate & Interpret',
    description: 'Create charts, explore data, and get AI-powered insights.',
  },
]

export function HowItWorksSection() {
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
    <section ref={sectionRef} className="relative z-10 px-4 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">
            Get Started in
            <span className="gradient-text-subtle"> Three Simple Steps</span>
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`relative text-center ${isVisible ? 'animate-on-scroll visible' : 'animate-on-scroll'} stagger-${index + 1}`}
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {step.number}
              </div>
              <h3 className="mb-2 font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function CTASection() {
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
    <section ref={sectionRef} className="relative z-10 bg-muted/50 px-4 py-20 backdrop-blur-md">
      <div className="mx-auto max-w-3xl text-center">
        <div className={isVisible ? 'animate-on-scroll visible' : 'animate-on-scroll'}>
          <h2 className="mb-4 text-3xl font-bold text-foreground">
            Ready to Work with
            <span className="gradient-text"> More Confidence?</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join professional astrologers using Astrologer Studio to calculate faster and communicate more clearly. Your
            subscription supports open-source development and gives you priority assistance.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="gap-2" data-umami-event="footer-start-trial-click">
                Start Your Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">No credit card required • Free forever plan available</p>
        </div>
      </div>
    </section>
  )
}
