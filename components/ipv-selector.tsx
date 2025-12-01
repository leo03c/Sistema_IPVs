"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, ArrowLeft, LogOut } from "lucide-react"
import { SalesInterface } from "@/components/sales-interface"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { IPVWithProducts } from "@/lib/types"

export function IPVSelector({
  ipvsWithProducts,
  userId,
}: {
  ipvsWithProducts: IPVWithProducts[]
  userId: string
}) {
  const [selectedIPV, setSelectedIPV] = useState<IPVWithProducts | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  // If user selected an IPV, show the sales interface
  if (selectedIPV) {
    return (
      <div>
        {/* Back button */}
        <div className="bg-white shadow-sm border-b">
          <div className="px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIPV(null)}
              className="text-gray-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a mis IPVs
            </Button>
          </div>
        </div>
        <SalesInterface
          ipv={selectedIPV.ipv}
          initialProducts={selectedIPV.products}
          userId={userId}
        />
      </div>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ipvsWithProducts.map(({ ipv, products }) => {
            const totalProducts = products.length
            const totalStock = products.reduce((sum, p) => sum + p.current_stock, 0)
            
            return (
              <Card
                key={ipv.id}
                className="cursor-pointer hover:shadow-lg transition-shadow bg-white"
                onClick={() => setSelectedIPV({ ipv, products })}
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
