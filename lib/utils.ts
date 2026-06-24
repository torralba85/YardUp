import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
