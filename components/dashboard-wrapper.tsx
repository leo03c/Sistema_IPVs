"use client"

import { usePreventLoginBack } from "@/lib/hooks/use-prevent-login-back"
import type { ReactNode } from "react"

/**
 * Client wrapper component for the dashboard that prevents
 * navigating back to the login page using the browser back button.
 */
export function DashboardWrapper({ children }: { children: ReactNode }) {
  usePreventLoginBack()
  return <>{children}</>
}
