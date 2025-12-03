"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const AUTH_ROUTES = ["/auth/login", "/auth/register"]
const DASHBOARD_PATH = "/dashboard"

/**
 * Custom hook to prevent users from navigating back to login/register pages
 * when they are authenticated and using protected pages.
 * 
 * This hook ensures that when an authenticated user presses the browser back button,
 * they cannot navigate to authentication pages. Instead, they are kept on protected pages.
 * 
 * It works by:
 * 1. Intercepting the browser's popstate event (back/forward navigation)
 * 2. Checking if the user is authenticated
 * 3. Preventing navigation to auth routes for authenticated users
 * 4. Replacing initial history entry when coming from auth pages
 * 
 * This hook should be used in all protected page components to work application-wide.
 * 
 * Note: This works together with middleware which also redirects authenticated users
 * away from auth pages as an additional layer of protection.
 */
export function usePreventLoginBack() {
  const router = useRouter()
  const pathname = usePathname()
  const isCheckingRef = useRef(false)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    // Check if we came from an auth page on initial mount
    const cameFromAuth = sessionStorage.getItem("came_from_auth")
    
    if (cameFromAuth === "true") {
      // Replace the current history entry to ensure auth pages aren't in history
      window.history.replaceState(null, "", pathname)
      // Clear the flag after use
      sessionStorage.removeItem("came_from_auth")
    }

    // Handler for browser back/forward button
    const handlePopState = async () => {
      // Prevent concurrent executions to avoid race conditions
      if (isCheckingRef.current) {
        return
      }

      // Get the target path from the current location
      const targetPath = window.location.pathname
      
      // Check if user is trying to navigate to an auth route
      if (AUTH_ROUTES.includes(targetPath)) {
        isCheckingRef.current = true
        
        try {
          // Check if user is authenticated using memoized client
          const { data: { user } } = await supabaseRef.current.auth.getUser()
          
          if (user) {
            // User is authenticated, redirect to dashboard
            // Use pushState to counteract the back navigation, then router.replace to update UI
            window.history.pushState(null, "", DASHBOARD_PATH)
            router.replace(DASHBOARD_PATH)
          }
        } finally {
          isCheckingRef.current = false
        }
      }
    }

    // Listen to popstate events (back/forward navigation)
    window.addEventListener("popstate", handlePopState)

    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [pathname, router])
}
