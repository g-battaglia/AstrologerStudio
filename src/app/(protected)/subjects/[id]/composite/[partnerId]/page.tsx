import { CompositeChartView } from '../../../../_components/CompositeChartView'

interface PageProps {
  params: Promise<{ id: string; partnerId: string }>
}

export default async function Page({ params }: PageProps) {
  const { id, partnerId } = await params
  return <CompositeChartView subjectId={id} partnerId={partnerId} />
}
