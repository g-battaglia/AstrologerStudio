'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createSubject } from '@/lib/api/subjects'
import type { Subject, CreateSubjectInput } from '@/types/subjects'
import { createSubjectSchema } from '@/lib/validation/subject'
import { useCreateSubjectDialogStore } from '@/stores/createSubjectDialog'
import { useState } from 'react'

export function useCreateSubjectDialog() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { open, setOpen, closeDialog } = useCreateSubjectDialogStore()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<CreateSubjectInput>({
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

  const mutation = useMutation({
    mutationFn: (data: CreateSubjectInput) => createSubject(data),
    onSuccess: (created) => {
      queryClient.setQueryData<Subject[]>(['subjects', { count: 50 }], (old) => {
        if (!old) return [created]
        return [created, ...old]
      })
      closeDialog()
      form.reset()
      // Navigate to the newly created subject's natal chart
      router.push(`/subjects/${created.id}/natal`)
    },
    onError: (err: unknown) => {
      setError((err as Error).message)
    },
  })

  const onSubmit = form.handleSubmit((values: CreateSubjectInput) => {
    if (mutation.isPending) return
    setError(null)
    mutation.mutate({ ...values })
  })

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !mutation.isPending) {
      setOpen(false)
      form.reset()
      setError(null)
    } else {
      setOpen(newOpen)
    }
  }

  return {
    open,
    onOpenChange: handleOpenChange,
    error,
    form,
    isCreating: mutation.isPending,
    onSubmit,
  }
}
