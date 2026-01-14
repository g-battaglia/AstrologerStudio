import { useQuery } from '@tanstack/react-query'

interface AIUsageData {
  usage: number
  limit: number
  remaining: number
}

export function useAIUsage() {
  return useQuery<AIUsageData>({
    queryKey: ['ai-usage'],
    queryFn: async () => {
      const res = await fetch('/api/ai/usage')
      if (!res.ok) {
        throw new Error('Failed to fetch AI usage')
      }
      return res.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
