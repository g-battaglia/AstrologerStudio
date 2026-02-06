import { clientLogger } from '@/lib/logging/client'

/**
 * Number of oldest entries to delete when quota is exceeded
 */
const ENTRIES_TO_DELETE_ON_QUOTA_ERROR = 10
const MAX_QUOTA_RECOVERY_RETRIES = 3
const MAX_ENTRIES_TO_DELETE_PER_ATTEMPT = 200

/**
 * Check if an error is a QuotaExceededError
 */
export function isQuotaExceededError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || error.code === 22
  }

  if (typeof error === 'object' && error !== null) {
    const domLikeError = error as { name?: string; code?: number }
    return (
      domLikeError.name === 'QuotaExceededError' ||
      domLikeError.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      domLikeError.code === 22
    )
  }

  return false
}

/**
 * Delete oldest entries from an IndexedDB object store
 * Used as a fallback when quota is exceeded
 */
export async function deleteOldestEntries(
  db: IDBDatabase,
  storeName: string,
  count: number = ENTRIES_TO_DELETE_ON_QUOTA_ERROR,
): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)

      const runDeletion = (request: IDBRequest<IDBCursorWithValue | null>) => {
        let deletedCount = 0

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
          if (cursor && deletedCount < count) {
            cursor.delete()
            deletedCount++
            cursor.continue()
          } else {
            if (deletedCount > 0) {
              clientLogger.info(`Deleted ${deletedCount} oldest entries from ${storeName} to free space`)
            }
            resolve(deletedCount)
          }
        }

        request.onerror = () => reject(request.error)
      }

      if (store.indexNames.contains('timestamp')) {
        // Open cursor from oldest to newest (ascending timestamp)
        runDeletion(store.index('timestamp').openCursor())
        return
      }

      clientLogger.warn('Timestamp index missing during quota recovery, falling back to key-order cleanup', {
        storeName,
      })
      runDeletion(store.openCursor())
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Perform a write operation with quota-recovery retries.
 * On quota errors it progressively deletes more old entries and retries.
 */
export async function writeWithQuotaRecovery(
  db: IDBDatabase,
  storeName: string,
  performWrite: () => Promise<void>,
): Promise<void> {
  let entriesToDelete = ENTRIES_TO_DELETE_ON_QUOTA_ERROR

  for (let attempt = 0; attempt <= MAX_QUOTA_RECOVERY_RETRIES; attempt++) {
    try {
      await performWrite()
      return
    } catch (error) {
      if (!isQuotaExceededError(error)) {
        throw error
      }

      if (attempt === MAX_QUOTA_RECOVERY_RETRIES) {
        throw error
      }

      clientLogger.warn('Storage quota exceeded, attempting progressive cleanup', {
        storeName,
        attempt: attempt + 1,
        entriesToDelete,
      })

      const deletedCount = await deleteOldestEntries(db, storeName, entriesToDelete)
      if (deletedCount === 0) {
        throw error
      }

      entriesToDelete = Math.min(entriesToDelete * 2, MAX_ENTRIES_TO_DELETE_PER_ATTEMPT)
    }
  }
}
