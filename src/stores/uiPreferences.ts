import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Component IDs for UI preferences
 * Each collapsible card/section should have a unique ID
 */
export type ComponentId = string

/**
 * UI Preferences Store
 *
 * Manages persistent UI state across the application, such as
 * collapsed/expanded states for cards and panels.
 *
 * @example
 * ```tsx
 * const { collapsed, toggleCollapsed } = useUIPreferences((state) => ({
 *   collapsed: state.collapsed['natal-houses-card'] ?? false,
 *   toggleCollapsed: () => state.toggleCollapsed('natal-houses-card')
 * }))
 * ```
 */
export type UIPreferencesState = {
  /** Record of collapsed states by component ID */
  collapsed: Partial<Record<ComponentId, boolean>>

  /** Record of card order by container ID */
  layout: Record<string, string[]>

  /** Set collapsed state for a specific component */
  setCollapsed: (componentId: ComponentId, collapsed: boolean) => void

  /** Toggle collapsed state for a specific component */
  toggleCollapsed: (componentId: ComponentId) => void

  /** Update the layout order for a specific container */
  updateLayout: (containerId: string, items: string[]) => void

  /** Move an item between containers or within the same container */
  moveItem: (activeId: string, overId: string, activeContainer: string, overContainer: string) => void

  /** Reset all UI preferences to defaults */
  resetAll: () => void
}

export const useUIPreferences = create<UIPreferencesState>()(
  persist(
    (set, get) => ({
      collapsed: {},
      layout: {},

      setCollapsed: (componentId, collapsed) =>
        set((state) => ({
          collapsed: { ...state.collapsed, [componentId]: collapsed },
        })),

      toggleCollapsed: (componentId) => {
        const current = get().collapsed[componentId] ?? false
        set((state) => ({
          collapsed: { ...state.collapsed, [componentId]: !current },
        }))
      },

      updateLayout: (containerId, items) =>
        set((state) => ({
          layout: { ...state.layout, [containerId]: items },
        })),

      moveItem: (activeId, overId, activeContainer, overContainer) => {
        set((state) => {
          const newLayout = { ...state.layout }

          // Ensure containers exist in layout
          if (!newLayout[activeContainer]) return state
          if (!newLayout[overContainer]) return state

          const activeItems = [...newLayout[activeContainer]]
          const overItems = [...newLayout[overContainer]]

          // Find indexes
          const activeIndex = activeItems.indexOf(activeId)
          const overIndex = overItems.indexOf(overId)

          if (activeContainer === overContainer) {
            // Same container reordering
            if (activeIndex !== overIndex) {
              // Remove and insert at new position
              activeItems.splice(activeIndex, 1)
              activeItems.splice(overIndex, 0, activeId)
              newLayout[activeContainer] = activeItems
            }
          } else {
            // Moving to different container
            activeItems.splice(activeIndex, 1)

            // If overId is in the container, insert before it.
            // If overId is the container itself (empty case), push to end?
            // For now assuming overId is an item.
            let newIndex = overIndex
            if (newIndex === -1) {
              // If dropping on container or empty space, append
              newIndex = overItems.length
            }

            overItems.splice(newIndex, 0, activeId)

            newLayout[activeContainer] = activeItems
            newLayout[overContainer] = overItems
          }

          return { layout: newLayout }
        })
      },

      resetAll: () => set({ collapsed: {}, layout: {} }),
    }),
    { name: 'ui-preferences' },
  ),
)
