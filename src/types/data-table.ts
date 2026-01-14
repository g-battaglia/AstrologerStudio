// Generic DataTable props used by our table component
// Types only; no runtime values.

import type { Table } from '@tanstack/react-table'

export interface DataTableProps<TData, TValue> {
  columns: import('@tanstack/react-table').ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading?: boolean
  footer?: React.ReactNode
  tableId?: string
  filterPlaceholder?: string
  /** Enable global filter to search across all visible columns */
  globalFilter?: boolean
  /** Use larger rows for easier selection on touch devices */
  largeRows?: boolean
  /** Optional area to the right of the search input for custom actions (e.g., Add). */
  toolbarActions?: React.ReactNode
  /** Render prop for custom settings menu. Receives table instance for column visibility control. */
  settingsMenu?: (table: Table<TData>) => React.ReactNode
  onRowClick?: (row: TData) => void
  bulkActions?: (selectedRows: TData[]) => React.ReactNode
  contextActions?: (selectedRows: TData[]) => React.ReactNode
  getRowId?: (row: TData) => string
}
