import { Aspect } from '@/types/astrology'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getAspectStyles } from './AspectGrid'
import { cn } from '@/lib/utils/cn'
import { formatPlanetName } from '@/lib/astrology/planet-formatting'

interface AspectTableProps {
  aspects: Aspect[]
  className?: string
  p1Label?: string
  p2Label?: string
  hideMovement?: boolean
}

export function AspectTable({ aspects, className, p1Label, p2Label, hideMovement = false }: AspectTableProps) {
  return (
    <div className={cn('rounded-md border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{p1Label || 'Planet 1'}</TableHead>
            <TableHead>Aspect</TableHead>
            <TableHead>{p2Label || 'Planet 2'}</TableHead>
            <TableHead className="text-right">Orb</TableHead>
            <TableHead className="text-right">Diff</TableHead>
            {!hideMovement && <TableHead>Movement</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {aspects.map((aspect, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{formatPlanetName(aspect.p1_name)}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn('capitalize', getAspectStyles(aspect.aspect).text, getAspectStyles(aspect.aspect).bg)}
                >
                  {aspect.aspect}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">{formatPlanetName(aspect.p2_name)}</TableCell>
              <TableCell className="text-right">{aspect.orbit.toFixed(2)}°</TableCell>
              <TableCell className="text-right">{aspect.diff.toFixed(2)}°</TableCell>
              {!hideMovement && (
                <TableCell className="capitalize text-sm text-muted-foreground">
                  {aspect.aspect_movement || '—'}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
