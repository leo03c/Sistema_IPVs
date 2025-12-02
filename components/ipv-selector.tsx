"use client"

import { useState } from "react"
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const ipvFromUrl = searchParams.get("ipv")
  
  // Initialize from URL
  const [selectedIPV, setSelectedIPV] = useState<IPVWithProducts | null>(() => {
    if (ipvFromUrl) {
      const found = ipvsWithProducts.find(({ ipv }) => ipv.id === ipvFromUrl)
      return found || null
    }
    return null
  })

  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  const handleSelectIPV = async (ipvData: IPVWithProducts) => {
    setIsLoading(true)
    
    // Actualizar URL
    const newParams = new URLSearchParams(searchParams. toString())
    newParams.set("ipv", ipvData.ipv.id)
    router.replace(`? ${newParams.toString()}`, { scroll: false })
    
    setSelectedIPV(ipvData)
    setIsLoading(false)
  }

  const handleBack = () => {
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.delete("ipv")
    newParams.delete("tab")
    router. replace(`?${newParams.toString()}`, { scroll: false })
    setSelectedIPV(null)
  }

  // Si hay IPV seleccionado, mostrar SalesInterface
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Mis Inventarios (IPVs)</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-600">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        {isLoading && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg flex items-center gap-3 shadow-lg">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-gray-700">Cargando productos...</span>
            </div>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ipvsWithProducts.map(({ ipv, products }) => {
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
                    <Badge variant={isIPVClosed ?  'secondary' : 'default'} className={isIPVClosed ?  'bg-gray-500' : 'bg-green-500'}>
                      {isIPVClosed ?  <><Lock className="h-3 w-3 mr-1" />Cerrado</> : <><LockOpen className="h-3 w-3 mr-1" />Abierto</>}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-gray-400">ID: {ipv. id}</p>
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
