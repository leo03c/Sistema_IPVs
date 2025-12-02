"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

/**
 * Global scroll restoration component
 * Saves and restores scroll position on page reload/navigation
 */
export function ScrollRestoration() {
  const pathname = usePathname()

  useEffect(() => {
    // Restore scroll position on mount
    const savedPosition = sessionStorage.getItem(`scroll-${pathname}`)
    if (savedPosition) {
      const position = parseInt(savedPosition, 10)
      window.scrollTo(0, position)
    }

    // Save scroll position before unload
    const handleBeforeUnload = () => {
      sessionStorage.setItem(`scroll-${pathname}`, window.scrollY.toString())
    }

    // Save scroll position periodically (in case of crashes)
    const handleScroll = () => {
      sessionStorage.setItem(`scroll-${pathname}`, window.scrollY.toString())
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [pathname])

  return null
}
