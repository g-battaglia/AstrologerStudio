/**
 * NOTE: DODO PAYMENTS - This page requires paid plan for chart access
 */
import { redirect } from 'next/navigation'
import { getSessionWithSubscription } from '@/lib/subscription'
import { canAccessChartType } from '@/lib/subscription/plan-limits'
import { SolarReturnView } from '../../../_components/SolarReturnView'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  // DODO PAYMENTS: Check chart access for free plan
  const session = await getSessionWithSubscription()
  if (!session || !canAccessChartType(session.subscriptionPlan, 'solar-return')) {
    redirect('/pricing')
  }

  const { id } = await params
  return <SolarReturnView subjectId={id} />
}
