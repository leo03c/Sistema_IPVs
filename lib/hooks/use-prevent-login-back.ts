"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

const DASHBOARD_PATH = "/dashboard"

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
 * 
 * Note: This is a supplementary measure. The primary fix is using router.replace()
 * in the login/register flows to prevent auth pages from being added to history.
 * Additionally, the middleware redirects authenticated users away from auth pages.
 */
export function usePreventLoginBack() {
  const pathname = usePathname()

  useEffect(() => {
    // Only apply this on the main dashboard page (not sub-pages)
    if (pathname !== DASHBOARD_PATH) {
      return
    }

    // Check if we came from an auth page using session storage (more reliable than referrer)
    const cameFromAuth = sessionStorage.getItem("came_from_auth")
    
    if (cameFromAuth === "true") {
      // Replace the current history entry to ensure proper navigation
      window.history.replaceState(null, "", DASHBOARD_PATH)
      // Clear the flag after use
      sessionStorage.removeItem("came_from_auth")
    }
  }, [pathname])
}
