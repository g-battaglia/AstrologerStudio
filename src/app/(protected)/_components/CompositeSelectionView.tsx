'use client'

import { PartnerSelectionView } from '@/components/PartnerSelectionView'

interface Props {
  subjectId: string
}

export function CompositeSelectionView({ subjectId }: Props) {
  return (
    <PartnerSelectionView
      subjectId={subjectId}
      chartType="composite"
      title="Composite Chart for {name}"
      subtitle="Select a partner to create a composite chart"
    />
  )
}
