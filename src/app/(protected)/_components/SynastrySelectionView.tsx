'use client'

import { PartnerSelectionView } from '@/components/PartnerSelectionView'

interface Props {
  subjectId: string
}

export function SynastrySelectionView({ subjectId }: Props) {
  return (
    <PartnerSelectionView
      subjectId={subjectId}
      chartType="synastry"
      title="Synastry for {name}"
      subtitle="Select a partner to compare charts"
    />
  )
}
