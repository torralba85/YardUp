"use client";

import type { ReactNode } from "react";
import { useWebBuilderAccess } from "@/lib/commerce/use-web-builder-access";

/** Hide builder navigation and help inside store apps. */
export function WebBuilderOnly({ children }: { children: ReactNode }) {
  return useWebBuilderAccess() ? children : null;
}
