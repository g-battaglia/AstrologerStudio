import fs from 'fs'
import path from 'path'

const MANUAL_DIR = path.join(process.cwd(), 'manual')

export type ManualItem = {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: ManualItem[]
  slug: string
}

export function getManualTree(dir: string = MANUAL_DIR, baseUrl: string = '/manual'): ManualItem[] {
  if (!fs.existsSync(dir)) {
    return []
  }

  const items = fs.readdirSync(dir, { withFileTypes: true })

  // Sort: Directories first, then files. Alphabetical order.
  const sortedItems = items.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1
    if (!a.isDirectory() && b.isDirectory()) return 1
    return a.name.localeCompare(b.name)
  })

  return sortedItems
    .map((item) => {
      const fullPath = path.join(dir, item.name)
      const relativePath = path.relative(MANUAL_DIR, fullPath)
      const slug = relativePath.replace(/\\/g, '/').replace(/\.md$/, '')

      // Clean name for display (remove number prefixes and extensions)
      // e.g., "01_intro" -> "Intro", "01_welcome.md" -> "Welcome"
      const cleanName = item.name
        .replace(/^\d+[-_]/, '') // Remove leading numbers
        .replace(/\.[^/.]+$/, '') // Remove extension
        .replace(/[-_]/g, ' ') // Replace separators with spaces
        .replace(/\b\w/g, (c) => c.toUpperCase()) // Title Case

      if (item.isDirectory()) {
        return {
          name: cleanName,
          path: relativePath,
          type: 'directory',
          slug: slug,
          children: getManualTree(fullPath, `${baseUrl}/${item.name}`),
        } as ManualItem
      } else {
        if (!item.name.endsWith('.md')) return null // Skip non-md files

        return {
          name: cleanName,
          path: relativePath,
          type: 'file',
          slug: slug,
        } as ManualItem
      }
    })
    .filter(Boolean) as ManualItem[]
}

export async function getManualContent(slugSegments: string[]): Promise<
  | {
      content: string
      lastModified: Date
    }
  | { redirectTo: string }
  | null
> {
  // Construct path from slug segments
  // User might visit /manual/01_intro/01_welcome
  // slugSegments = ['01_intro', '01_welcome']

  const relativePath = slugSegments.join('/')
  const fullPath = path.join(MANUAL_DIR, relativePath)

  // Check if it's a directory - if so, redirect to first file
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    const firstFile = findFirstFile(fullPath)
    if (firstFile) {
      const redirectSlug = path.relative(MANUAL_DIR, firstFile).replace(/\\/g, '/').replace(/\.md$/, '')
      return { redirectTo: `/manual/${redirectSlug}` }
    }
    return null
  }

  // Try as a file with .md extension
  const filePath = fullPath + '.md'
  if (!fs.existsSync(filePath)) {
    return null
  }

  const source = fs.readFileSync(filePath, 'utf8')

  return {
    content: source,
    lastModified: fs.statSync(filePath).mtime,
  }
}

// Helper to find the first .md file in a directory (recursively)
function findFirstFile(dir: string): string | null {
  const items = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))

  for (const item of items) {
    const itemPath = path.join(dir, item.name)
    if (item.isFile() && item.name.endsWith('.md')) {
      return itemPath
    }
    if (item.isDirectory()) {
      const found = findFirstFile(itemPath)
      if (found) return found
    }
  }
  return null
}

// Flatten the manual tree into a list of files for navigation
function flattenManualTree(items: ManualItem[]): ManualItem[] {
  const result: ManualItem[] = []
  for (const item of items) {
    if (item.type === 'file') {
      result.push(item)
    }
    if (item.children) {
      result.push(...flattenManualTree(item.children))
    }
  }
  return result
}

export type ManualNavLink = {
  title: string
  slug: string
}

// Get prev/next navigation for a given slug
export function getManualNavigation(currentSlug: string): {
  prev: ManualNavLink | null
  next: ManualNavLink | null
} {
  const tree = getManualTree()
  const flatList = flattenManualTree(tree)

  const currentIndex = flatList.findIndex((item) => item.slug === currentSlug)

  if (currentIndex === -1) {
    return { prev: null, next: null }
  }

  const prev = currentIndex > 0 ? flatList[currentIndex - 1] : null
  const next = currentIndex < flatList.length - 1 ? flatList[currentIndex + 1] : null

  return {
    prev: prev ? { title: prev.name, slug: prev.slug } : null,
    next: next ? { title: next.name, slug: next.slug } : null,
  }
}
