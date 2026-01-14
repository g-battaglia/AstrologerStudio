import { SynastryChartView } from '../../../../_components/SynastryChartView'

interface PageProps {
  params: Promise<{ id: string; partnerId: string }>
}

export default async function Page({ params }: PageProps) {
  const { id, partnerId } = await params
  return <SynastryChartView subjectId={id} partnerId={partnerId} />
}
