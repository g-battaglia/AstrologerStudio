import { NatalChartView } from '../../../_components/NatalChartView'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params
  return <NatalChartView subjectId={id} />
}
