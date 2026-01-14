'use client'

import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Suspense } from 'react'
import legalContent from '@/data/legal-content.json'

type LegalSection = {
  title?: string
  content?: string[]
  list?: Array<{ label?: string; text: string }>
}

type LegalPageData = {
  title: string
  lastUpdated: string
  intro: string[]
  sections: LegalSection[]
  contact?: {
    text: string
    email: string
  }
}

function LegalContentRender({ data }: { data: LegalPageData }) {
  return (
    <div className="prose prose-slate dark:prose-invert prose-headings:mt-8 prose-headings:mb-4 prose-p:my-3 prose-ul:my-3 prose-li:my-1 prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground max-w-none">
      <h1>{data.title}</h1>
      <p className="lead">Last Updated: {data.lastUpdated}</p>

      {data.intro.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}

      {data.sections.map((section, index) => (
        <div key={index}>
          {section.title && <h2>{section.title}</h2>}
          {section.content?.map((paragraph, pIndex) => (
            <p key={pIndex}>{paragraph}</p>
          ))}
          {section.list && (
            <ul>
              {section.list.map((item, lIndex) => (
                <li key={lIndex}>
                  {item.label && <strong>{item.label}: </strong>}
                  {item.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {data.contact && (
        <>
          <h2>Contact Us</h2>
          <p>
            {data.contact.text}
            <br />
            <strong>Email:</strong> {data.contact.email}
          </p>
        </>
      )}
    </div>
  )
}

// Privacy Content
function PrivacyContent() {
  return <LegalContentRender data={legalContent.privacy} />
}

// Terms Content
function TermsContent() {
  return <LegalContentRender data={legalContent.terms} />
}

// Cookies Content
function CookiesContent() {
  return <LegalContentRender data={legalContent.cookies} />
}

// Accessibility Content
function AccessibilityContent() {
  return <LegalContentRender data={legalContent.accessibility} />
}

// License Content
function LicenseContent() {
  return <LegalContentRender data={legalContent.license} />
}

// Refund Content
function RefundContent() {
  return <LegalContentRender data={legalContent.refund} />
}

// Tab mapping for URL params
const TAB_MAP: Record<string, string> = {
  privacy: 'privacy',
  terms: 'terms',
  cookies: 'cookies',
  accessibility: 'accessibility',
  license: 'license',
  refund: 'refund',
}

function LegalTabs() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const defaultTab = tabParam && TAB_MAP[tabParam] ? TAB_MAP[tabParam] : 'privacy'

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="mb-0">
        <TabsTrigger
          value="privacy"
          className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
        >
          Privacy
        </TabsTrigger>
        <TabsTrigger
          value="terms"
          className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
        >
          Terms
        </TabsTrigger>
        <TabsTrigger
          value="cookies"
          className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
        >
          Cookies
        </TabsTrigger>
        <TabsTrigger
          value="accessibility"
          className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
        >
          Accessibility
        </TabsTrigger>
        <TabsTrigger
          value="license"
          className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
        >
          License
        </TabsTrigger>
        <TabsTrigger
          value="refund"
          className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
        >
          Refund
        </TabsTrigger>
      </TabsList>

      <TabsContent value="privacy">
        <PrivacyContent />
      </TabsContent>
      <TabsContent value="terms">
        <TermsContent />
      </TabsContent>
      <TabsContent value="cookies">
        <CookiesContent />
      </TabsContent>
      <TabsContent value="accessibility">
        <AccessibilityContent />
      </TabsContent>
      <TabsContent value="license">
        <LicenseContent />
      </TabsContent>
      <TabsContent value="refund">
        <RefundContent />
      </TabsContent>
    </Tabs>
  )
}

export default function LegalPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LegalTabs />
    </Suspense>
  )
}
