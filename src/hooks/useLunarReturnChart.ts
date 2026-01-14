import { useQuery } from '@tanstack/react-query'
import { getLunarReturnChart } from '@/actions/astrology'
import { Subject } from '@/types/subjects'
import { PlanetaryReturnRequestOptions } from '@/types/astrology'

export function useLunarReturnChart(subject: Subject | null | undefined, options?: PlanetaryReturnRequestOptions) {
  return useQuery({
    queryKey: ['lunar-return-chart', subject?.id, options],
    queryFn: () => {
      if (!subject) throw new Error('Subject is required')
      return getLunarReturnChart(subject, options)
    },
    enabled: !!subject && !!options,
    placeholderData: (previousData) => previousData,
  })
}
