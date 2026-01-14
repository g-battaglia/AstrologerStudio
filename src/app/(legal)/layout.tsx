import { Footer } from '@/components/landing/Footer'
import { LandingNavbar } from '@/components/landing/LandingNavbar'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingNavbar />
      <main className="flex-1 px-4 py-20">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
      <Footer />
    </div>
  )
}
