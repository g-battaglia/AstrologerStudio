import type { Metadata } from 'next'
import { NowChartView } from '../_components/NowChartView'
import { CheckoutSuccessHandler } from '@/components/CheckoutSuccessHandler'

export const metadata: Metadata = {
  title: 'Now Chart',
  description: 'View current planetary positions and astrological chart for this moment',
}

/**
 * Home page - displays current "now" chart
 */
export default function Page() {
  return (
    <>
      <CheckoutSuccessHandler />
      <NowChartView />
    </>
  )
}
