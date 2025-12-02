"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, LogOut, Loader2, Lock, LockOpen } from "lucide-react"
import { SalesInterface } from "@/components/sales-interface"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import type { IPVWithProducts, Product } from "@/lib/types"
import { Badge } from "@/components/ui/badge"

export function IPVSelector({
  ipvsWithProducts,
  userId,
}: {
  ipvsWithProducts: IPVWithProducts[]
  userId: string
}) {
  const [selectedIPV, setSelectedIPV] = useState<IPVWithProducts | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  // Track refreshed products state to show updated stock counts
  const [refreshedProducts, setRefreshedProducts] = useState<Map<string, Product[]>>(new Map())
  // Track if we've already restored from URL on mount to prevent redundant restoration
  const hasRestoredFromUrl = useRef(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  // Fetch fresh products from the database when selecting an IPV
  const handleSelectIPV = useCallback(async (ipvData: IPVWithProducts) => {
    setIsLoading(true)
    try {
      // Fetch fresh products from the database
      const { data: freshProducts } = await supabase
        .from("products")
        .select("*")
        .eq("ipv_id", ipvData.ipv.id)
        .order("name")

      const products = (freshProducts || []) as Product[]
      
      // Update refreshed products cache
      setRefreshedProducts(prev => new Map(prev).set(ipvData.ipv.id, products))
      
      setSelectedIPV({
        ipv: ipvData.ipv,
        products
      })

      // Update URL to persist selection
      const newParams = new URLSearchParams(searchParams.toString())
      newParams.set("ipv", ipvData.ipv.id)
      router.replace(`?${newParams.toString()}`, { scroll: false })
    } catch (error) {
      console.error("Error loading products:", error)
      // Fallback to cached products if fetch fails
      setSelectedIPV(ipvData)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, searchParams, router])

  // Restore selected IPV from URL on mount
  useEffect(() => {
    const ipvId = searchParams.get("ipv")
    // Only restore once on initial mount, not on subsequent URL changes
    if (ipvId && !selectedIPV && !hasRestoredFromUrl.current) {
      hasRestoredFromUrl.current = true
      const ipvData = ipvsWithProducts.find(({ ipv }) => ipv.id === ipvId)
      if (ipvData) {
        // Note: This logic is similar to handleSelectIPV but inlined to avoid circular dependency.
        // handleSelectIPV depends on searchParams, which would cause this effect to re-run
        // on every URL change. We inline the logic here and skip the URL update since
        // the IPV ID is already in the URL.
        setIsLoading(true)
        supabase
          .from("products")
          .select("*")
          .eq("ipv_id", ipvData.ipv.id)
          .order("name")
          .then(({ data: freshProducts }) => {
            const products = (freshProducts || []) as Product[]
            setRefreshedProducts(prev => new Map(prev).set(ipvData.ipv.id, products))
            setSelectedIPV({
              ipv: ipvData.ipv,
              products
            })
          })
          .catch((error) => {
            console.error("Error loading products:", error)
            // Fallback to cached products if fetch fails
            setSelectedIPV(ipvData)
          })
          .finally(() => {
            setIsLoading(false)
          })
      }
    }
  }, [ipvsWithProducts, searchParams, selectedIPV, supabase])

  // Handle going back from SalesInterface - refresh products for all IPVs
  const handleBack = useCallback(async () => {
    setIsLoading(true)
    setSelectedIPV(null)
    // Reset the restoration flag so user can navigate to another IPV after going back
    hasRestoredFromUrl.current = false
    
    // Remove IPV and tab from URL
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.delete("ipv")
    newParams.delete("tab")
    router.replace(`?${newParams.toString()}`, { scroll: false })
    
    try {
      // Fetch fresh products for all IPVs to update stock counts
      const ipvIds = ipvsWithProducts.map(({ ipv }) => ipv.id)
      const { data: freshProducts } = await supabase
        .from("products")
        .select("*")
        .in("ipv_id", ipvIds)
        .order("name")

      if (freshProducts) {
        // Group products by IPV ID
        const productsByIpv = new Map<string, Product[]>()
        for (const product of freshProducts as Product[]) {
          const ipvId = product.ipv_id
          if (ipvId) {
            if (!productsByIpv.has(ipvId)) {
              productsByIpv.set(ipvId, [])
            }
            productsByIpv.get(ipvId)!.push(product)
          }
        }
        setRefreshedProducts(productsByIpv)
      }
    } catch (error) {
      console.error("Error refreshing products:", error)
    } finally {
      setIsLoading(false)
    }
  }, [ipvsWithProducts, supabase, searchParams, router])

  // If user selected an IPV, show the sales interface
  if (selectedIPV) {
    return (
      <SalesInterface
        ipv={selectedIPV.ipv}
        initialProducts={selectedIPV.products}
        userId={userId}
        onBack={handleBack}
      />
    )
  }

  // Show IPV selection grid
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Mis Inventarios (IPVs)</h1>
            <p className="text-xs text-gray-500">Selecciona un inventario para gestionar ventas</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-600">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        {isLoading && (
          <div 
            className="fixed inset-0 bg-black/20 flex items-center justify-center z-50"
            role="dialog"
            aria-label="Cargando productos"
            aria-live="polite"
          >
            <div className="bg-white p-4 rounded-lg flex items-center gap-3 shadow-lg">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-gray-700">Cargando productos...</span>
            </div>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ipvsWithProducts.map(({ ipv, products: initialProducts }) => {
            // Use refreshed products if available, otherwise use initial products
            const products = refreshedProducts.get(ipv.id) || initialProducts
            const totalProducts = products.length
            const totalStock = products.reduce((sum, p) => sum + p.current_stock, 0)
            const isIPVClosed = ipv.status === 'closed'
            
            return (
              <Card
                key={ipv.id}
                className={cn(
                  "cursor-pointer hover:shadow-lg transition-shadow bg-white",
                  isLoading && "pointer-events-none opacity-50"
                )}
                onClick={() => handleSelectIPV({ ipv, products })}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <span className="flex-1">{ipv.name}</span>
                    <Badge variant={isIPVClosed ? 'secondary' : 'default'} className={isIPVClosed ? 'bg-gray-500' : 'bg-green-500'}>
                      {isIPVClosed ? <><Lock className="h-3 w-3 mr-1" />Cerrado</> : <><LockOpen className="h-3 w-3 mr-1" />Abierto</>}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {ipv.description && (
                    <p className="text-sm text-gray-600">{ipv.description}</p>
                  )}
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-600">
                      Productos: <span className="font-semibold">{totalProducts}</span>
                    </span>
                    <span className="text-gray-600">
                      Stock Total: <span className="font-semibold">{totalStock}</span>
                    </span>
                  </div>
                  <Button className="w-full mt-2" variant={isIPVClosed ? "secondary" : "default"}>
                    {isIPVClosed ? "Ver Información" : "Gestionar Ventas"}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
