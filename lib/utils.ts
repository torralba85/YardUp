import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Teach tailwind-merge the design-system scales that scripts/design/generate.mjs
// writes into app/design-theme.css, so `rounded-control` and the hard `shadow-*`
// tokens resolve conflicts like the built-in sizes do (otherwise
// `cn("rounded-control", "rounded-none")` keeps both).
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["control"],
      shadow: ["paper", "paper-sm", "card", "overlay", "callout"],
    },
  },
})

/**
 * Merge class names, resolving Tailwind conflicts.
 *
 * Combines `clsx` (conditional class composition) with `tailwind-merge` so that
 * later utility classes win over earlier conflicting ones (e.g. `px-2 px-4`
 * collapses to `px-4`).
 *
 * @param inputs - Class values: strings, arrays, or conditional objects.
 * @returns A single merged, de-conflicted class name string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
