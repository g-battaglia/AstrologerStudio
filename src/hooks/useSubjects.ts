'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { fetchRandomSubjects, deleteSubject, updateSubject, createSubject, importSubjects } from '@/lib/api/subjects'
import type { Subject, UpdateSubjectInput, CreateSubjectInput } from '@/types/subjects'
import { updateSubjectSchema, createSubjectSchema } from '@/lib/validation/subject'

export function useSubjects() {
  const queryClient = useQueryClient()

  // Data fetching
  const query = useQuery({
    queryKey: ['subjects', { count: 50 }],
    queryFn: ({ signal }) => fetchRandomSubjects(50, signal),
    staleTime: 1000 * 60, // 1 minuto
    retry: 2,
  })

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  // Edit form
  const editForm = useForm<UpdateSubjectInput>({
    defaultValues: {
      id: '',
      name: '',
      city: '',
      nation: '',
      birthDate: '',
      birthTime: '',
      latitude: undefined,
      longitude: undefined,
      timezone: 'UTC',
      rodens_rating: null,
      tags: null,
    },
    mode: 'onSubmit',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(updateSubjectSchema as any),
  })

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Create form
  const createForm = useForm<CreateSubjectInput>({
    defaultValues: {
      name: '',
      city: '',
      nation: '',
      birthDate: '',
      birthTime: '',
      latitude: undefined,
      longitude: undefined,
      timezone: 'UTC',
      rodens_rating: null,
      tags: null,
    },
    mode: 'onSubmit',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createSubjectSchema as any),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSubject(id),
    onSuccess: (result) => {
      queryClient.setQueryData<Subject[]>(['subjects', { count: 50 }], (old) => {
        if (!old) return old
        return old.filter((u) => u.id !== result.id)
      })
      setDeleteDialogOpen(false)
      setSubjectToDelete(null)
    },
    onError: (err: unknown) => {
      setDeleteError((err as Error).message)
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateSubjectInput) => updateSubject(data),
    onSuccess: (upd) => {
      queryClient.setQueryData<Subject[]>(['subjects', { count: 50 }], (old) => {
        if (!old) return old
        return old.map((u) =>
          u.id === upd.id
            ? {
                ...u,
                ...upd,
              }
            : u,
        )
      })
      setEditDialogOpen(false)
      setSubjectToEdit(null)
    },
    onError: (err: unknown) => {
      setEditError((err as Error).message)
    },
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateSubjectInput) => createSubject(data),
    onSuccess: (created) => {
      queryClient.setQueryData<Subject[]>(['subjects', { count: 50 }], (old) => {
        if (!old) return [created]
        return [created, ...old]
      })
      setCreateDialogOpen(false)
      createForm.reset()
    },
    onError: (err: unknown) => {
      setCreateError((err as Error).message)
    },
  })

  const importMutation = useMutation({
    mutationFn: (data: CreateSubjectInput[]) => importSubjects(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })

  // Action handlers
  const openDeleteDialog = (subject: Subject) => {
    setSubjectToDelete(subject)
    setDeleteError(null)
    setDeleteDialogOpen(true)
  }

  const openEditDialog = (subject: Subject) => {
    setSubjectToEdit(subject)
    setEditError(null)
    editForm.reset({
      id: subject.id,
      name: subject.name,
      city: subject.city || '',
      nation: subject.nation || '',
      birthDate: subject.birth_datetime ? new Date(subject.birth_datetime).toISOString() : '',
      birthTime: (() => {
        const d = new Date(subject.birth_datetime)
        if (isNaN(d.getTime())) return ''
        const hh = String(d.getUTCHours()).padStart(2, '0')
        const mm = String(d.getUTCMinutes()).padStart(2, '0')
        const ss = String(d.getUTCSeconds()).padStart(2, '0')
        return `${hh}:${mm}:${ss}`
      })(),
      latitude: subject.latitude ?? undefined,
      longitude: subject.longitude ?? undefined,
      timezone: subject.timezone,
      rodens_rating: subject.rodens_rating ?? null,
      tags: subject.tags ?? null,
    })
    setEditDialogOpen(true)
  }

  const openCreateDialog = () => {
    setCreateError(null)
    createForm.reset({
      name: '',
      city: '',
      nation: '',
      birthDate: '',
      birthTime: '',
      latitude: undefined,
      longitude: undefined,
      timezone: 'UTC',
      rodens_rating: null,
      tags: null,
    })
    setCreateDialogOpen(true)
  }

  const confirmDelete = () => {
    if (!subjectToDelete || deleteMutation.isPending) return
    deleteMutation.mutate(subjectToDelete.id)
  }

  const submitEdit = editForm.handleSubmit((values: UpdateSubjectInput) => {
    if (updateMutation.isPending) return
    setEditError(null)
    updateMutation.mutate({ ...values })
  })

  const submitCreate = createForm.handleSubmit((values: CreateSubjectInput) => {
    if (createMutation.isPending) return
    setCreateError(null)
    createMutation.mutate({ ...values })
  })

  return {
    // Data
    query,

    // Delete dialog
    deleteDialog: {
      open: deleteDialogOpen,
      setOpen: setDeleteDialogOpen,
      subject: subjectToDelete,
      error: deleteError,
      mutation: deleteMutation,
      onConfirm: confirmDelete,
    },

    // Edit dialog
    editDialog: {
      open: editDialogOpen,
      setOpen: setEditDialogOpen,
      subject: subjectToEdit,
      error: editError,
      form: editForm,
      mutation: updateMutation,
      onSubmit: submitEdit,
    },

    // Create dialog
    createDialog: {
      open: createDialogOpen,
      setOpen: setCreateDialogOpen,
      error: createError,
      form: createForm,
      mutation: createMutation,
      onSubmit: submitCreate,
    },

    importMutation,

    // Actions
    actions: {
      openDeleteDialog,
      openEditDialog,
      openCreateDialog,
    },
  }
}
