'use client'

/**
 * Settings dropdown menu for the Subjects table
 *
 * Provides a unified menu with:
 * - Import from CSV
 * - Export to CSV
 * - Column visibility toggles
 *
 * @module components/SubjectsTableSettings
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { Settings, Download, Upload, Columns, RotateCcw } from 'lucide-react'
import type { Table } from '@tanstack/react-table'
import type { Subject } from '@/types/subjects'
import { useTablePreferences } from '@/stores/tablePreferences'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SubjectsTableSettingsProps {
  /** React Table instance for column visibility */
  table: Table<Subject>
  /** Table ID for persisting preferences */
  tableId: string
  /** Handler for export action */
  onExport: () => void
  /** Handler for import action (opens dialog) */
  onImport: () => void
  /** Whether export is disabled (e.g., no data) */
  exportDisabled?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SubjectsTableSettings({
  table,
  tableId,
  onExport,
  onImport,
  exportDisabled = false,
}: SubjectsTableSettingsProps) {
  const [open, setOpen] = useState(false)
  const resetTable = useTablePreferences((s) => s.resetTable)

  const columns = table.getAllLeafColumns().filter((col) => col.getCanHide())

  const handleResetColumns = () => {
    resetTable(tableId)
    // Reset to default visibility
    columns.forEach((col) => col.toggleVisibility(true))
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="size-4" />
          <span className="hidden md:inline">Settings</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* Import/Export Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">Data</DropdownMenuLabel>

        <DropdownMenuItem onClick={onImport}>
          <Upload className="size-4 mr-2" />
          Import from CSV
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onExport} disabled={exportDisabled}>
          <Download className="size-4 mr-2" />
          Export to CSV
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Column Visibility Section */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Columns className="size-4 mr-2" />
            Column Visibility
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <div className="flex items-center justify-between px-2 py-1.5 border-b">
              <span className="text-xs text-muted-foreground">Columns</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={handleResetColumns}
                title="Reset to default"
              >
                <RotateCcw className="size-3" />
              </Button>
            </div>

            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(checked) => column.toggleVisibility(checked)}
                className="capitalize"
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
