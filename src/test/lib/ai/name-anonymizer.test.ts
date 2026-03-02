/**
 * Unit Tests for Name Anonymizer
 *
 * Tests the privacy-preserving name anonymization system that replaces
 * real subject names with placeholder tokens before sending prompts to
 * the LLM, and restores them in the streamed response.
 *
 * @module src/lib/ai/name-anonymizer
 */
import { describe, it, expect } from 'vitest'
import {
  createNameMappings,
  anonymizeText,
  deanonymizeText,
  createDeanonymizingStream,
  MAX_PLACEHOLDER_LENGTH,
  type NameMapping,
} from '@/lib/ai/name-anonymizer'

// ─────────────────────────────────────────────────────────────────────────────
// createNameMappings
// ─────────────────────────────────────────────────────────────────────────────

describe('createNameMappings', () => {
  it('should create 1-indexed placeholder mappings', () => {
    const mappings = createNameMappings(['Alice', 'Bob'])
    expect(mappings).toEqual([
      { realName: 'Alice', placeholder: '__SUBJECT_1__' },
      { realName: 'Bob', placeholder: '__SUBJECT_2__' },
    ])
  })

  it('should preserve original order (not sort by length)', () => {
    const mappings = createNameMappings(['Al', 'Alexander'])
    expect(mappings[0]!.realName).toBe('Al')
    expect(mappings[0]!.placeholder).toBe('__SUBJECT_1__')
    expect(mappings[1]!.realName).toBe('Alexander')
    expect(mappings[1]!.placeholder).toBe('__SUBJECT_2__')
  })

  it('should return empty array for empty input', () => {
    expect(createNameMappings([])).toEqual([])
  })

  it('should handle a single name', () => {
    const mappings = createNameMappings(['Giovanni Rossi'])
    expect(mappings).toHaveLength(1)
    expect(mappings[0]!.placeholder).toBe('__SUBJECT_1__')
  })

  it('should produce placeholders shorter than MAX_PLACEHOLDER_LENGTH', () => {
    const mappings = createNameMappings(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'])
    for (const m of mappings) {
      expect(m.placeholder.length).toBeLessThanOrEqual(MAX_PLACEHOLDER_LENGTH)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// anonymizeText
// ─────────────────────────────────────────────────────────────────────────────

describe('anonymizeText', () => {
  it('should replace a single name with its placeholder', () => {
    const mappings = createNameMappings(['Alice'])
    const result = anonymizeText("Alice's Sun is in Aries.", mappings)
    expect(result).toBe("__SUBJECT_1__'s Sun is in Aries.")
  })

  it('should replace multiple names', () => {
    const mappings = createNameMappings(['Alice', 'Bob'])
    const result = anonymizeText("Alice's Venus conjunct Bob's Mars.", mappings)
    expect(result).toBe("__SUBJECT_1__'s Venus conjunct __SUBJECT_2__'s Mars.")
  })

  it('should replace all occurrences of each name', () => {
    const mappings = createNameMappings(['Alice'])
    const result = anonymizeText('Alice has Sun in Aries. Alice also has Moon in Cancer.', mappings)
    expect(result).toBe('__SUBJECT_1__ has Sun in Aries. __SUBJECT_1__ also has Moon in Cancer.')
  })

  it('should apply longest-first replacement to avoid partial clobbering', () => {
    // "John Doe" must be replaced before "John" to avoid
    // "John Doe" → "__SUBJECT_2__ Doe" (wrong)
    const mappings = createNameMappings(['John', 'John Doe'])
    const result = anonymizeText("John Doe's Sun and John's Moon.", mappings)
    expect(result).toBe("__SUBJECT_2__'s Sun and __SUBJECT_1__'s Moon.")
  })

  it('should return text unchanged if no names match', () => {
    const mappings = createNameMappings(['Alice'])
    const result = anonymizeText('The Sun is in Aries.', mappings)
    expect(result).toBe('The Sun is in Aries.')
  })

  it('should handle empty mappings', () => {
    const result = anonymizeText('Hello world', [])
    expect(result).toBe('Hello world')
  })

  it('should handle empty text', () => {
    const mappings = createNameMappings(['Alice'])
    expect(anonymizeText('', mappings)).toBe('')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// deanonymizeText
// ─────────────────────────────────────────────────────────────────────────────

describe('deanonymizeText', () => {
  it('should replace placeholders with real names', () => {
    const mappings = createNameMappings(['Alice', 'Bob'])
    const result = deanonymizeText("__SUBJECT_1__'s Venus conjunct __SUBJECT_2__'s Mars.", mappings)
    expect(result).toBe("Alice's Venus conjunct Bob's Mars.")
  })

  it('should be the inverse of anonymizeText', () => {
    const original = "Giovanni Rossi's Sun conjunct Maria Bianchi's Moon in the 7th house."
    const mappings = createNameMappings(['Giovanni Rossi', 'Maria Bianchi'])
    const anonymized = anonymizeText(original, mappings)
    const restored = deanonymizeText(anonymized, mappings)
    expect(restored).toBe(original)
  })

  it('should handle text with no placeholders', () => {
    const mappings = createNameMappings(['Alice'])
    expect(deanonymizeText('Plain text.', mappings)).toBe('Plain text.')
  })

  it('should handle empty mappings', () => {
    expect(deanonymizeText('__SUBJECT_1__ text', [])).toBe('__SUBJECT_1__ text')
  })

  it('should replace multiple occurrences', () => {
    const mappings = createNameMappings(['Alice'])
    const result = deanonymizeText('__SUBJECT_1__ has Sun in Aries. __SUBJECT_1__ also has Moon in Cancer.', mappings)
    expect(result).toBe('Alice has Sun in Aries. Alice also has Moon in Cancer.')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// createDeanonymizingStream — full streaming simulation
// ─────────────────────────────────────────────────────────────────────────────

describe('createDeanonymizingStream', () => {
  /**
   * Helper: pipe an array of string chunks through the de-anonymizing stream
   * and collect the output into a single string.
   */
  async function streamThrough(chunks: string[], mappings: NameMapping[]): Promise<string> {
    const transform = createDeanonymizingStream(mappings)
    const readable = new ReadableStream<string>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk)
        }
        controller.close()
      },
    })

    const reader = readable.pipeThrough(transform).getReader()
    let result = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      result += value
    }
    return result
  }

  it('should pass through text unchanged when no mappings', async () => {
    const result = await streamThrough(['Hello ', 'world'], [])
    expect(result).toBe('Hello world')
  })

  it('should de-anonymize a complete placeholder in a single chunk', async () => {
    const mappings = createNameMappings(['Alice'])
    const result = await streamThrough(["__SUBJECT_1__'s Sun in Aries."], mappings)
    expect(result).toBe("Alice's Sun in Aries.")
  })

  it('should de-anonymize a placeholder split across two chunks', async () => {
    const mappings = createNameMappings(['Alice'])
    // Split right in the middle: "__SUBJECT" + "_1__'s Sun"
    const result = await streamThrough(['__SUBJECT', "_1__'s Sun in Aries."], mappings)
    expect(result).toBe("Alice's Sun in Aries.")
  })

  it('should de-anonymize a placeholder split at the closing __', async () => {
    const mappings = createNameMappings(['Alice'])
    // Split between digit and closing: "__SUBJECT_1" + "__'s Sun"
    const result = await streamThrough(['__SUBJECT_1', "__'s Sun in Aries."], mappings)
    expect(result).toBe("Alice's Sun in Aries.")
  })

  it('should de-anonymize a placeholder split at a single trailing _', async () => {
    const mappings = createNameMappings(['Alice'])
    // Split after one underscore of closing: "__SUBJECT_1_" + "_'s Sun"
    const result = await streamThrough(['__SUBJECT_1_', "_'s Sun in Aries."], mappings)
    expect(result).toBe("Alice's Sun in Aries.")
  })

  it('should handle multiple placeholders across many chunks', async () => {
    const mappings = createNameMappings(['Giovanni Rossi', 'Maria Bianchi'])
    const chunks = ['__SUB', "JECT_1__'s Venus ", 'conjunct __SUBJECT_2', "__'s Mars."]
    const result = await streamThrough(chunks, mappings)
    expect(result).toBe("Giovanni Rossi's Venus conjunct Maria Bianchi's Mars.")
  })

  it('should not buffer markdown double underscores like __bold__', async () => {
    const mappings = createNameMappings(['Alice'])
    // "__bold__" should pass through without issues
    const result = await streamThrough(['Use __bold__ for emphasis. ', "__SUBJECT_1__'s chart."], mappings)
    expect(result).toBe("Use __bold__ for emphasis. Alice's chart.")
  })

  it('should handle chunk that is just "__"', async () => {
    const mappings = createNameMappings(['Alice'])
    const result = await streamThrough(['Hello ', '__', 'SUBJECT_1__', ' world'], mappings)
    expect(result).toBe('Hello Alice world')
  })

  it('should handle empty chunks', async () => {
    const mappings = createNameMappings(['Alice'])
    const result = await streamThrough(['', '__SUBJECT_1__', '', "'s Sun.", ''], mappings)
    expect(result).toBe("Alice's Sun.")
  })

  it('should never leak placeholder tokens in the final output', async () => {
    const mappings = createNameMappings(['Alice', 'Bob'])
    // Adversarial chunking: split at every possible boundary
    const fullText = "__SUBJECT_1__'s Sun conjunct __SUBJECT_2__'s Moon. __SUBJECT_1__ should communicate."
    // Split into single-character chunks
    const chars = fullText.split('')
    const result = await streamThrough(chars, mappings)

    expect(result).not.toContain('__SUBJECT_')
    expect(result).toBe("Alice's Sun conjunct Bob's Moon. Alice should communicate.")
  })

  it('should handle text with no placeholders at all', async () => {
    const mappings = createNameMappings(['Alice'])
    const result = await streamThrough(['The Sun is ', 'in Aries ', 'in the 1st house.'], mappings)
    expect(result).toBe('The Sun is in Aries in the 1st house.')
  })

  it('should handle a realistic AI response with irregular chunk sizes', async () => {
    const mappings = createNameMappings(['Giovanni Rossi', 'Maria Bianchi'])
    const fullText = [
      '### Synastry Overview\n\n',
      "__SUBJECT_1__'s Sun in Aries conjunct __SUBJECT_2__'s Ascendant creates ",
      "an immediate spark of recognition. __SUBJECT_2__'s Venus in the 7th house ",
      'of __SUBJECT_1__ suggests deep romantic attraction.\n\n',
      '### Quick Summary\n',
      '- Core vibe: __SUBJECT_1__ and __SUBJECT_2__ share magnetic attraction\n',
      '- Key friction: Communication styles differ\n',
      '- Best nurture: Weekly heart-to-heart conversations',
    ]
    const result = await streamThrough(fullText, mappings)

    expect(result).not.toContain('__SUBJECT_')
    expect(result).toContain("Giovanni Rossi's Sun in Aries")
    expect(result).toContain("Maria Bianchi's Ascendant")
    expect(result).toContain("Maria Bianchi's Venus")
    expect(result).toContain('Giovanni Rossi and Maria Bianchi share')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Round-trip: anonymize → AI simulation → de-anonymize
// ─────────────────────────────────────────────────────────────────────────────

describe('round-trip anonymization', () => {
  it('should restore original names after anonymize → deanonymize', () => {
    const names = ['Giovanni Rossi', 'Maria Bianchi']
    const mappings = createNameMappings(names)
    const context =
      "Giovanni Rossi's Sun at 24° Gemini in Maria Bianchi's 8th House. " +
      "Maria Bianchi's Venus conjunct Giovanni Rossi's Mars."

    const anonymized = anonymizeText(context, mappings)
    expect(anonymized).not.toContain('Giovanni Rossi')
    expect(anonymized).not.toContain('Maria Bianchi')
    expect(anonymized).toContain('__SUBJECT_1__')
    expect(anonymized).toContain('__SUBJECT_2__')

    const restored = deanonymizeText(anonymized, mappings)
    expect(restored).toBe(context)
  })

  it('should work end-to-end with streaming', async () => {
    const names = ['Alice Smith', 'Bob Jones']
    const mappings = createNameMappings(names)

    // Simulate: original context → anonymize → "AI responds with placeholders" → stream de-anonymize
    const originalContext = "Alice Smith's Moon opposite Bob Jones's Saturn."
    const anonymizedContext = anonymizeText(originalContext, mappings)

    // Simulate AI response using the placeholders
    const aiResponse = `${anonymizedContext} This aspect suggests tension between ${mappings[0]!.placeholder} and ${mappings[1]!.placeholder}.`

    // Stream de-anonymize with irregular chunks
    const chunks: string[] = []
    for (let i = 0; i < aiResponse.length; i += 7) {
      chunks.push(aiResponse.slice(i, i + 7))
    }

    const transform = createDeanonymizingStream(mappings)
    const readable = new ReadableStream<string>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk)
        controller.close()
      },
    })

    const reader = readable.pipeThrough(transform).getReader()
    let result = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      result += value
    }

    expect(result).not.toContain('__SUBJECT_')
    expect(result).toContain("Alice Smith's Moon opposite Bob Jones's Saturn.")
    expect(result).toContain('tension between Alice Smith and Bob Jones')
  })
})
