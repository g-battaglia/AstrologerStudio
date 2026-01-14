'use client'

import type { KeyboardEvent } from 'react'

/**
 * Selector for focusable elements within a form container.
 * Includes links, enabled buttons, inputs, selects, textareas, and elements with tabindex.
 */
const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Checks if the current browser is Firefox.
 * @returns true if running in Firefox, false otherwise
 */
function isFirefox(): boolean {
  return typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent)
}

/**
 * Gets all visible, focusable elements within a container.
 * Filters out elements hidden via CSS (display:none or visibility:hidden).
 *
 * @param container - The HTML element to search within
 * @returns Array of focusable HTML elements in DOM order
 */
function getVisibleFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    const style = window.getComputedStyle(el)
    return style.display !== 'none' && style.visibility !== 'hidden'
  })
}

/**
 * Hook that provides a keyboard event handler to fix Firefox tab navigation
 * within form containers.
 *
 * Firefox sometimes has issues with proper focus management in dialogs,
 * especially with complex forms containing multiple input types. This hook
 * manually handles Tab/Shift+Tab to ensure consistent navigation.
 *
 * @returns A keyboard event handler to attach to a form's onKeyDown prop
 *
 * @example
 * ```tsx
 * const handleFormKeyDown = useFirefoxTabHandler()
 * return <form onKeyDown={handleFormKeyDown}>...</form>
 * ```
 */
export function useFirefoxTabHandler() {
  const handleKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    // Only handle Tab key, skip if already prevented
    if (e.key !== 'Tab' || e.defaultPrevented) return

    // Only apply Firefox workaround
    if (!isFirefox()) return

    const container = e.currentTarget
    const focusables = getVisibleFocusables(container)

    if (focusables.length === 0) return

    // Find current focused element
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const current =
      active && (active.matches(FOCUSABLE_SELECTOR) ? active : active.closest<HTMLElement>(FOCUSABLE_SELECTOR))
    const currentIndex = current ? focusables.indexOf(current) : -1

    // Prevent default and manually handle focus
    e.preventDefault()

    const nextIndex = e.shiftKey
      ? currentIndex <= 0
        ? focusables.length - 1
        : currentIndex - 1
      : currentIndex === -1 || currentIndex === focusables.length - 1
        ? 0
        : currentIndex + 1

    focusables[nextIndex]?.focus()
  }

  return handleKeyDown
}
