import { useQuery } from '@tanstack/react-query'
import { getSolarReturnChart } from '@/actions/astrology'
import { Subject } from '@/types/subjects'
import { PlanetaryReturnRequestOptions } from '@/types/astrology'

export function useSolarReturnChart(subject: Subject | null | undefined, options?: PlanetaryReturnRequestOptions) {
  return useQuery({
    queryKey: ['solar-return-chart', subject?.id, options],
    queryFn: () => {
      if (!subject) throw new Error('Subject is required')
      return getSolarReturnChart(subject, options)
    },
    enabled: !!subject && !!options,
    placeholderData: (previousData) => previousData,
  })
}
