import Link from 'next/link'

export function Footer() {
  return (
    <footer className="landing-footer relative z-10 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <span className="brand-heading text-lg font-medium text-foreground">Astrologer Studio</span>
            <div className="flex flex-col items-center text-xs text-muted-foreground md:items-start">
              <span>© 2026 Giacomo Battaglia</span>
              <span>VAT No.: IT02768710200</span>
              <span>
                License:{' '}
                <a
                  href="https://www.gnu.org/licenses/agpl-3.0.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline transition-colors hover:text-foreground"
                >
                  AGPLv3
                </a>
                {' | '}
                <a
                  href="https://github.com/g-battaglia/AstrologerStudio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline transition-colors hover:text-foreground"
                >
                  Source Code
                </a>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground md:justify-end">
            <Link
              href="/about"
              className="transition-colors hover:text-foreground"
              data-umami-event="footer-about-click"
            >
              About
            </Link>
            <Link
              href="/legal?tab=privacy"
              className="transition-colors hover:text-foreground"
              data-umami-event="footer-privacy-click"
            >
              Privacy
            </Link>
            <Link
              href="/legal?tab=terms"
              className="transition-colors hover:text-foreground"
              data-umami-event="footer-terms-click"
            >
              Terms
            </Link>
            <Link
              href="/legal?tab=accessibility"
              className="transition-colors hover:text-foreground"
              data-umami-event="footer-accessibility-click"
            >
              Accessibility
            </Link>
            <Link
              href="/legal?tab=cookies"
              className="transition-colors hover:text-foreground"
              data-umami-event="footer-cookies-click"
            >
              Cookies
            </Link>
            <Link
              href="/legal?tab=dpa"
              className="transition-colors hover:text-foreground"
              data-umami-event="footer-dpa-click"
            >
              DPA
            </Link>
            <Link
              href="/legal?tab=refund"
              className="transition-colors hover:text-foreground"
              data-umami-event="footer-refund-click"
            >
              Refund Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
