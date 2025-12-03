"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

/**
 * Custom hook to prevent users from navigating back to login page
 * when they are authenticated and on the dashboard.
 * 
 * This hook ensures that when a user is on the dashboard after logging in,
 * pressing the back button will keep them on the dashboard instead of
 * taking them back to the login page.
 * 
 * It works by replacing the current history entry on mount to ensure
 * the previous page (login) is not in the history stack.
 */
export function usePreventLoginBack() {
  const pathname = usePathname()

  useEffect(() => {
    // Only apply this on the main dashboard page (not sub-pages)
    if (pathname !== "/dashboard") {
      return
    }

    // Check if the referrer was a login or auth page
    const referrer = document.referrer
    const isFromAuthPage = referrer && (
      referrer.includes("/auth/login") || 
      referrer.includes("/auth/register") ||
      referrer.endsWith("/") // root page that redirects to login
    )

    if (isFromAuthPage) {
      // Replace the current history entry to remove the auth page from history
      // This ensures the back button won't go to login
      window.history.replaceState(null, "", "/dashboard")
    }
  }, [pathname])
}
