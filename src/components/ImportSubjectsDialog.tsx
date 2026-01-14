'use client'

/**
 * Dialog component for importing subjects from CSV files
 *
 * Features:
 * - CSV file upload with validation
 * - Preview of parsed subjects
 * - Error display for invalid rows
 * - Deduplication (skips existing subjects)
 *
 * @module components/ImportSubjectsDialog
 */

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useSubjects } from '@/hooks/useSubjects'
import { Upload, AlertCircle, Loader2, FileUp, X } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import type { CreateSubjectInput } from '@/types/subjects'
import { parseSubjectCSVRow, type SubjectCSVRow } from '@/lib/csv/subjects'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ImportSubjectsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ImportSubjectsDialog({ open, onOpenChange }: ImportSubjectsDialogProps) {
  const { importMutation } = useSubjects()
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<CreateSubjectInput[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /** Reset all state to initial values */
  const reset = () => {
    setFile(null)
    setParsedData([])
    setParseErrors([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /** Handle file selection and parse CSV */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setIsParsing(true)
    setParseErrors([])
    setParsedData([])

    Papa.parse<SubjectCSVRow>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsParsing(false)

        if (results.errors.length > 0) {
          setParseErrors(results.errors.map((e) => `Row ${e.row}: ${e.message}`))
          return
        }

        const validSubjects: CreateSubjectInput[] = []
        const errors: string[] = []

        results.data.forEach((row, index) => {
          // Skip completely empty rows
          if (!row.name && !row.birthDatetime) return

          const result = parseSubjectCSVRow(row, index + 2) // +2 for header + 1-indexed
          if (result.success && result.data) {
            validSubjects.push(result.data)
          } else if (result.error) {
            errors.push(result.error)
          }
        })

        setParseErrors(errors)
        setParsedData(validSubjects)
      },
      error: (error) => {
        setIsParsing(false)
        setParseErrors([error.message])
      },
    })
  }

  /** Submit parsed subjects for import */
  const handleImport = () => {
    if (parsedData.length === 0) return

    importMutation.mutate(parsedData, {
      onSuccess: (data) => {
        const parts = [`Created ${data.created}`]
        if (data.skipped > 0) parts.push(`skipped ${data.skipped} duplicates`)
        if (data.failed > 0) parts.push(`${data.failed} failed`)

        toast.success('Import complete', { description: parts.join(', ') })

        if (data.failed > 0 && data.errors.length > 0) {
          setParseErrors(data.errors)
        } else {
          onOpenChange(false)
          reset()
        }
      },
      onError: (err) => {
        toast.error('Import failed', { description: err.message })
      },
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) reset()
        onOpenChange(val)
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Subjects from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV with columns: <code>name</code>, <code>birthDatetime</code> (ISO), <code>city</code>,{' '}
            <code>nation</code>, <code>timezone</code>...
            <br />
            <span className="text-xs">Duplicate subjects (same name + birthdate) will be skipped.</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
          {!file ? (
            <FileDropzone onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </FileDropzone>
          ) : (
            <div className="flex flex-col gap-4 h-full">
              {/* File info bar */}
              <div className="flex items-center justify-between bg-muted/30 p-3 rounded-md border">
                <span className="font-medium truncate max-w-sm">{file.name}</span>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <X className="size-4 mr-2" /> Change
                </Button>
              </div>

              {/* Loading state */}
              {isParsing && (
                <div className="flex items-center justify-center p-8 text-muted-foreground">
                  <Loader2 className="size-6 animate-spin mr-2" />
                  Parsing file...
                </div>
              )}

              {/* Error display */}
              {parseErrors.length > 0 && <ErrorList errors={parseErrors} />}

              {/* Preview table */}
              {!isParsing && parsedData.length > 0 && <PreviewTable data={parsedData} />}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || parsedData.length === 0 || importMutation.isPending}>
            {importMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" /> Importing...
              </>
            ) : (
              <>
                <Upload className="size-4 mr-2" /> Import {parsedData.length} Subjects
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────────────────

/** Dropzone for file selection */
function FileDropzone({ onClick, children }: { onClick: () => void; children?: React.ReactNode }) {
  return (
    <div
      className="border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition cursor-pointer"
      onClick={onClick}
    >
      <FileUp className="size-12 mb-4 opacity-50" />
      <p className="font-medium text-lg">Click to select CSV file</p>
      <p className="text-sm">or drag and drop here</p>
      {children}
    </div>
  )
}

/** Display list of parsing/validation errors */
function ErrorList({ errors }: { errors: string[] }) {
  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive">
      <div className="flex items-center gap-2 font-medium">
        <AlertCircle className="size-4" />
        Found {errors.length} error{errors.length !== 1 ? 's' : ''}
      </div>
      <div className="mt-2 text-xs opacity-90 max-h-32 overflow-y-auto pl-6">
        {errors.map((e, i) => (
          <div key={i}>{e}</div>
        ))}
      </div>
    </div>
  )
}

/** Preview table showing parsed subjects */
function PreviewTable({ data }: { data: CreateSubjectInput[] }) {
  return (
    <div className="flex-1 flex flex-col min-h-0 border rounded-md">
      <div className="p-2 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
        Preview ({data.length} valid subject{data.length !== 1 ? 's' : ''})
      </div>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Date/Time</TableHead>
              <TableHead>Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>
                  {row.birthDate ? new Date(row.birthDate).toLocaleDateString() : '—'} {row.birthTime}
                </TableCell>
                <TableCell>{[row.city, row.nation].filter(Boolean).join(', ') || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
