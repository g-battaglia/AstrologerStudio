import { useEffect, useRef, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { SortingState, VisibilityState, ColumnFiltersState, FilterFn } from '@tanstack/react-table'
import type { DataTableProps } from '@/types/data-table'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Checkbox from '@radix-ui/react-checkbox'
import { Check, Eye, RotateCcw, X } from 'lucide-react'
import { useTablePreferences } from '@/stores/tablePreferences'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'

interface GlobalFilterInputProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

function GlobalFilterInput({ value, onChange, placeholder }: GlobalFilterInputProps) {
  const [localValue, setLocalValue] = useState(value)
  const debounced = useDebouncedValue(localValue, 300)

  // Sync external changes
  useEffect(() => {
    if (value !== localValue) setLocalValue(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Apply debounced value
  useEffect(() => {
    onChange(debounced)
  }, [debounced, onChange])

  return (
    <div className="relative max-w-xs">
      <Input
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pr-8"
      />
      {localValue && (
        <button
          type="button"
          onClick={() => {
            setLocalValue('')
            onChange('')
          }}
          aria-label="Clear filter"
          className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex size-6 items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

// Global filter function that searches across all text fields
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalFilterFn: FilterFn<any> = (row, _columnId, filterValue) => {
  if (!filterValue || typeof filterValue !== 'string') return true
  const search = filterValue.toLowerCase().trim()
  if (!search) return true

  // Get all values from the row and search through them
  const values = row.getAllCells().map((cell) => {
    const value = cell.getValue()
    if (value == null) return ''
    if (Array.isArray(value)) return value.join(' ')
    return String(value)
  })

  return values.some((val) => val.toLowerCase().includes(search))
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  footer,
  tableId,
  filterPlaceholder = 'Filter...',
  globalFilter: useGlobalFilter = false,
  largeRows = false,
  toolbarActions,
  settingsMenu,
  onRowClick,
  bulkActions,
  contextActions,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState({})
  const defaultColumnVisibility = (() => {
    if (tableId === 'subjects-table') return { id: false } as VisibilityState
    return {} as VisibilityState
  })()
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaultColumnVisibility)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // Stable callback ref for global filter to avoid unnecessary re-renders
  const handleGlobalFilterChange = useRef((value: string) => setGlobalFilter(value)).current

  // Zustand store integration
  const persistedVisibility = useTablePreferences((s) => (tableId ? s.columnVisibility[tableId] : undefined))
  const setPersisted = useTablePreferences((s) => s.setColumnVisibility)
  const resetTable = useTablePreferences((s) => s.resetTable)

  // Track first load to avoid persisting while hydrating from storage
  const isInitialLoadRef = useRef(true)

  // Apply persisted visibility exactly once per tableId (first time it becomes available)
  useEffect(() => {
    if (!tableId) return
    if (!persistedVisibility) {
      // No stored state -> mark initial load complete so user actions persist
      if (isInitialLoadRef.current) isInitialLoadRef.current = false
      return
    }
    if (isInitialLoadRef.current) {
      setColumnVisibility(persistedVisibility)
      isInitialLoadRef.current = false
    }
  }, [tableId, persistedVisibility])

  // Persist user changes (skip during initial hydration)
  useEffect(() => {
    if (!tableId) return
    if (isInitialLoadRef.current) return
    const record: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(columnVisibility)) {
      if (typeof v === 'boolean') record[k] = v
    }
    const persisted = persistedVisibility || {}
    const recordKeys = Object.keys(record)
    const persistedKeys = Object.keys(persisted)
    if (recordKeys.length === persistedKeys.length && recordKeys.every((k) => persisted[k] === record[k])) {
      return
    }
    setPersisted(tableId, record)
  }, [columnVisibility, tableId, setPersisted, persistedVisibility])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, columnFilters, rowSelection, globalFilter },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId,
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {useGlobalFilter && (
            <GlobalFilterInput
              value={globalFilter}
              onChange={handleGlobalFilterChange}
              placeholder={filterPlaceholder}
            />
          )}
          {toolbarActions}

          {Object.keys(rowSelection).length > 0 && contextActions && (
            <div className="flex items-center gap-2">
              {contextActions(table.getSelectedRowModel().rows.map((r) => r.original))}
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {Object.keys(rowSelection).length > 0 && bulkActions && (
              <div className="flex items-center gap-2">
                {bulkActions(table.getSelectedRowModel().rows.map((r) => r.original))}
              </div>
            )}

            {/* Custom settings menu or default View dropdown */}
            {settingsMenu ? (
              settingsMenu(table)
            ) : (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button variant="outline" size="sm" className="inline-flex items-center gap-1">
                    <Eye className="size-4" /> <span className="hidden md:inline">View</span>
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content
                  side="bottom"
                  align="end"
                  className="z-50 min-w-48 rounded-md border bg-background p-1 shadow-md animate-in fade-in-0 zoom-in-95"
                >
                  {tableId && (
                    <div className="flex items-center justify-between px-2 py-1.5 mb-1 border-b text-xs uppercase tracking-wide text-muted-foreground">
                      <span>{tableId}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => {
                          resetTable(tableId)
                          setColumnVisibility({})
                        }}
                        title="Reset columns"
                      >
                        <RotateCcw className="size-4" />
                      </Button>
                    </div>
                  )}
                  {table
                    .getAllLeafColumns()
                    .filter((col) => col.getCanHide())
                    .map((column) => {
                      const id = column.id
                      const checked = column.getIsVisible()
                      return (
                        <DropdownMenu.Item
                          key={id}
                          className="flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                          onSelect={(e) => {
                            e.preventDefault()
                            column.toggleVisibility()
                          }}
                        >
                          <Checkbox.Root
                            checked={checked}
                            onCheckedChange={() => column.toggleVisibility()}
                            className="flex size-4 items-center justify-center rounded border border-input bg-background data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                          >
                            <Checkbox.Indicator>
                              <Check className="size-3" />
                            </Checkbox.Indicator>
                          </Checkbox.Root>
                          <span className="capitalize">
                            {typeof column.columnDef.header === 'string' ? column.columnDef.header : id}
                          </span>
                        </DropdownMenu.Item>
                      )
                    })}
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            )}
          </div>
        </div>
      </div>
      <div className="overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => onRowClick?.(row.original)}
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isSelect = cell.column.id === 'select'
                    const isActions = cell.column.id === 'actions'
                    return (
                      <TableCell
                        key={cell.id}
                        onClick={(e) => {
                          // Stop propagation for select and actions columns to prevent row click
                          if (isSelect) {
                            e.stopPropagation()
                            // If clicking the checkbox itself (which is a button), let it handle the toggle
                            if (e.target instanceof Element && e.target.closest('button[role="checkbox"]')) {
                              return
                            }
                            row.toggleSelected(!row.getIsSelected())
                          }
                          if (isActions) {
                            e.stopPropagation()
                          }
                        }}
                        className={cn(isSelect ? 'cursor-pointer' : '', largeRows && 'py-4')}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          {(() => {
            const filtered = table.getFilteredRowModel().rows.length
            const total = table.getCoreRowModel().rows.length
            return filtered !== total ? `${filtered} / ${total} rows` : `${total} rows`
          })()}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
          </span>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
      {footer}
    </div>
  )
}

export type { ColumnDef } from '@tanstack/react-table'
