import type { UseFormReturn, Path, PathValue, FieldValues } from 'react-hook-form'

/**
 * Type-safe form field setter helper
 * Eliminates the need for `as any` type assertions when setting form values
 * with generic form types
 *
 * @param form - React Hook Form instance
 * @param field - Field name to set
 * @param value - Value to set
 * @param options - Optional setValue options
 *
 * @example
 * ```tsx
 * // Instead of:
 * form.setValue('latitude' as Path<FormValues>, latitude as any, { shouldDirty: true })
 *
 * // Use:
 * setFormField(form, 'latitude', latitude, { shouldDirty: true })
 * ```
 */
export function setFormField<TForm extends FieldValues, TField extends Path<TForm>>(
  form: UseFormReturn<TForm>,
  field: TField,
  value: PathValue<TForm, TField>,
  options?: { shouldDirty?: boolean; shouldTouch?: boolean; shouldValidate?: boolean },
): void {
  form.setValue(field, value, options)
}

/**
 * Location form fields interface
 * Used for forms that include location data
 */
export interface LocationFormFields {
  city?: string
  nation?: string
  latitude?: number
  longitude?: number
  timezone: string
}

/**
 * Type-safe location field setter for forms with location data
 * Specifically handles the common pattern of setting location fields
 *
 * @param form - Form that extends LocationFormFields
 * @param field - Location field name
 * @param value - Value to set (type depends on field)
 * @param options - Optional setValue options
 */
export function setLocationField<TForm extends LocationFormFields>(
  form: UseFormReturn<TForm>,
  field: keyof LocationFormFields,
  value: string | number | undefined,
  options?: { shouldDirty?: boolean; shouldTouch?: boolean; shouldValidate?: boolean },
): void {
  // Use type assertion internally to avoid exposing complexity to callers
  const fieldPath = field as Path<TForm>
  const fieldValue = value as PathValue<TForm, typeof fieldPath>
  form.setValue(fieldPath, fieldValue, options)
}

/**
 * Batch set multiple location fields at once
 * Useful when selecting a city from suggestions
 *
 * @param form - Form that extends LocationFormFields
 * @param values - Object with location field values to set
 * @param options - Optional setValue options (applied to all fields)
 */
export function setLocationFields<TForm extends LocationFormFields>(
  form: UseFormReturn<TForm>,
  values: Partial<LocationFormFields>,
  options?: { shouldDirty?: boolean; shouldTouch?: boolean; shouldValidate?: boolean },
): void {
  const entries = Object.entries(values) as [keyof LocationFormFields, string | number | undefined][]

  for (const [field, value] of entries) {
    if (value !== undefined) {
      setLocationField(form, field, value, options)
    }
  }
}
