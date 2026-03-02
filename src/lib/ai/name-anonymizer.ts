/**
 * Name Anonymizer for AI Interpretations
 *
 * Replaces real subject names with deterministic placeholders before sending
 * prompts to the LLM, and restores them in the streamed response.
 * This ensures personal names never leave the server boundary.
 *
 * @module
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface NameMapping {
  /** The real name as stored in the database */
  realName: string
  /** The placeholder token sent to the LLM (e.g. "__SUBJECT_1__") */
  placeholder: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Prefix/suffix used for placeholder tokens — chosen to never appear in natural astrology text */
const PLACEHOLDER_PREFIX = '__SUBJECT_'
const PLACEHOLDER_SUFFIX = '__'

/**
 * Maximum length of any placeholder token.
 * Used by the streaming de-anonymizer to know how many trailing bytes to buffer.
 * "__SUBJECT_99__" = 14 chars — 16 is a safe ceiling.
 */
export const MAX_PLACEHOLDER_LENGTH = 16

// ─────────────────────────────────────────────────────────────────────────────
// Core functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a bi-directional mapping between real names and placeholder tokens.
 *
 * @param names - Array of real subject names (1-indexed in the output)
 * @returns Array of mappings preserving the original order (1-indexed).
 *          Longest-first sorting is applied internally by {@link anonymizeText}
 *          to prevent partial matches.
 *
 * @example
 * ```ts
 * createNameMappings(["John Doe", "Mary"])
 * // [
 * //   { realName: "John Doe", placeholder: "__SUBJECT_1__" },
 * //   { realName: "Mary",     placeholder: "__SUBJECT_2__" },
 * // ]
 * ```
 */
export function createNameMappings(names: string[]): NameMapping[] {
  return names.map((name, index) => ({
    realName: name,
    placeholder: `${PLACEHOLDER_PREFIX}${index + 1}${PLACEHOLDER_SUFFIX}`,
  }))
}

/**
 * Replace every occurrence of each real name with its placeholder.
 * Replacements are applied longest-first to avoid partial matches.
 *
 * @param text - The text that may contain real names
 * @param mappings - Mappings produced by {@link createNameMappings}
 * @returns Text with all real names replaced by placeholders
 */
export function anonymizeText(text: string, mappings: NameMapping[]): string {
  // Sort longest-first so "John Doe" is replaced before "John",
  // preventing partial matches that leave residual fragments.
  const sorted = [...mappings].sort((a, b) => b.realName.length - a.realName.length)
  let result = text
  for (const { realName, placeholder } of sorted) {
    result = result.replaceAll(realName, placeholder)
  }
  return result
}

/**
 * Replace every occurrence of each placeholder with the real name.
 * This is the inverse of {@link anonymizeText}.
 *
 * @param text - The text that may contain placeholder tokens
 * @param mappings - Mappings produced by {@link createNameMappings}
 * @returns Text with all placeholders replaced by real names
 */
export function deanonymizeText(text: string, mappings: NameMapping[]): string {
  let result = text
  for (const { realName, placeholder } of mappings) {
    result = result.replaceAll(placeholder, realName)
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Streaming de-anonymizer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a {@link TransformStream} that de-anonymizes placeholder tokens
 * back to real names as chunks flow through.
 *
 * The stream keeps a small tail buffer (up to {@link MAX_PLACEHOLDER_LENGTH}
 * bytes) to avoid emitting a placeholder that was split across two chunks.
 *
 * @param mappings - Mappings produced by {@link createNameMappings}
 * @returns A `TransformStream<string, string>` that can be piped between
 *          the AI SDK text stream and the HTTP response.
 *
 * @example
 * ```ts
 * const transform = createDeanonymizingStream(mappings)
 * const readable = aiTextStream.pipeThrough(transform)
 * return new Response(readable)
 * ```
 */
export function createDeanonymizingStream(mappings: NameMapping[]): TransformStream<string, string> {
  // If there are no mappings, pass-through without buffering
  if (mappings.length === 0) {
    return new TransformStream()
  }

  let buffer = ''

  return new TransformStream<string, string>({
    transform(chunk, controller) {
      buffer += chunk

      // Keep the tail if it might contain a partial placeholder.
      // A partial placeholder looks like: __ or __S or __SUBJECT_ etc.
      // We find the last occurrence of the placeholder prefix start ("__")
      // and if it's within MAX_PLACEHOLDER_LENGTH of the end, we hold it back.
      const safeEnd = findSafeSplitPoint(buffer)

      if (safeEnd > 0) {
        const safe = buffer.slice(0, safeEnd)
        buffer = buffer.slice(safeEnd)
        controller.enqueue(deanonymizeText(safe, mappings))
      }
      // else: entire buffer is a potential partial placeholder — wait for more data
    },

    flush(controller) {
      // Emit whatever is left, de-anonymized
      if (buffer.length > 0) {
        controller.enqueue(deanonymizeText(buffer, mappings))
        buffer = ''
      }
    },
  })
}

/**
 * Find the index up to which we can safely emit text without risking
 * splitting a placeholder token in half.
 *
 * Uses a two-pass approach:
 * 1. Find all *complete* placeholders via regex — everything up to and
 *    including the last one is safe.
 * 2. In the remaining tail (after the last complete placeholder), check
 *    if it ends with something that could be the *start* of a new placeholder.
 *
 * This avoids the pitfall where the closing `__` of a complete placeholder
 * (e.g. `__SUBJECT_1__`) is mistaken for the opening of a new one.
 *
 * @internal
 */
function findSafeSplitPoint(text: string): number {
  // Pass 1: find the end of the last complete placeholder in the text
  const placeholderRegex = /__SUBJECT_\d+__/g
  let lastCompleteEnd = 0
  let match: RegExpExecArray | null

  while ((match = placeholderRegex.exec(text)) !== null) {
    lastCompleteEnd = match.index + match[0].length
  }

  // Pass 2: in the remaining text after the last complete placeholder,
  // check if it ends with a partial placeholder start.
  const remaining = text.slice(lastCompleteEnd)

  // Check suffixes from longest possible down to length 1.
  // A single trailing "_" must be buffered because it could be the first
  // half of "__" that starts a placeholder (split across two chunks).
  for (let len = Math.min(MAX_PLACEHOLDER_LENGTH, remaining.length); len >= 1; len--) {
    const suffix = remaining.slice(-len)
    if (isPartialPlaceholder(suffix)) {
      return text.length - len
    }
  }

  return text.length
}

/**
 * Check if a string could be the beginning of a placeholder token
 * that hasn't been fully received yet.
 *
 * Matches two shapes:
 * - A prefix of `__SUBJECT_` itself (e.g. `__`, `__S`, `__SU`, …)
 * - The full prefix followed by digits and at most one trailing `_`
 *   (e.g. `__SUBJECT_1`, `__SUBJECT_12_`)
 *
 * @internal
 */
function isPartialPlaceholder(s: string): boolean {
  // Case 1: s is a prefix of the placeholder prefix itself
  if (PLACEHOLDER_PREFIX.startsWith(s)) return true

  // Case 2: full prefix + digits, optionally one trailing "_" (half of closing "__")
  if (s.startsWith(PLACEHOLDER_PREFIX)) {
    const rest = s.slice(PLACEHOLDER_PREFIX.length)
    return /^\d+_?$/.test(rest)
  }

  return false
}
