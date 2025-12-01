"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, LogOut, Loader2 } from "lucide-react"
import { SalesInterface } from "@/components/sales-interface"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { IPVWithProducts, Product } from "@/lib/types"

export function IPVSelector({
  ipvsWithProducts,
  userId,
}: {
  ipvsWithProducts: IPVWithProducts[]
  userId: string
}) {
  const [selectedIPV, setSelectedIPV] = useState<IPVWithProducts | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  // Fetch fresh products from the database when selecting an IPV
  const handleSelectIPV = async (ipvData: IPVWithProducts) => {
    setIsLoading(true)
    try {
      // Fetch fresh products from the database
      const { data: freshProducts } = await supabase
        .from("products")
        .select("*")
        .eq("ipv_id", ipvData.ipv.id)
        .order("name")

      setSelectedIPV({
        ipv: ipvData.ipv,
        products: (freshProducts || []) as Product[]
      })
    } catch (error) {
      console.error("Error loading products:", error)
      // Fallback to cached products if fetch fails
      setSelectedIPV(ipvData)
    } finally {
      setIsLoading(false)
    }
  }

  // If user selected an IPV, show the sales interface
  if (selectedIPV) {
    return (
      <SalesInterface
        ipv={selectedIPV.ipv}
        initialProducts={selectedIPV.products}
        userId={userId}
        onBack={() => setSelectedIPV(null)}
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
            
            return (
              <Card
                key={ipv.id}
                className={`cursor-pointer hover:shadow-lg transition-shadow bg-white ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
                onClick={() => handleSelectIPV({ ipv, products })}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    {ipv.name}
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
                  <Button className="w-full mt-2" variant="default">
                    Gestionar Ventas
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
