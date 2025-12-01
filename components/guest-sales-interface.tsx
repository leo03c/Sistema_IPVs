"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, Banknote, CreditCard, DollarSign, Calculator } from "lucide-react"
import Link from "next/link"

interface GuestProduct {
  id: string
  name: string
  price: number
  soldCash: number
  soldTransfer: number
}

interface BillCount {
  denomination: number
  count: number
}

const STORAGE_KEY_PRODUCTS = "guest_products"
const STORAGE_KEY_BILLS = "guest_bills"

const defaultBills: BillCount[] = [
  { denomination: 1000, count: 0 },
  { denomination: 500, count: 0 },
  { denomination: 200, count: 0 },
  { denomination: 100, count: 0 },
  { denomination: 50, count: 0 },
  { denomination: 20, count: 0 },
  { denomination: 10, count: 0 },
  { denomination: 5, count: 0 },
  { denomination: 1, count: 0 },
]

export function GuestSalesInterface() {
  const [products, setProducts] = useState<GuestProduct[]>([])
  const [newProductName, setNewProductName] = useState("")
  const [newProductPrice, setNewProductPrice] = useState("")
  const [activeTab, setActiveTab] = useState<"products" | "stats" | "bills">("products")
  const [isLoaded, setIsLoaded] = useState(false)

  // Bill denominations
  const [bills, setBills] = useState<BillCount[]>(defaultBills)

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedProducts = localStorage.getItem(STORAGE_KEY_PRODUCTS)
      const savedBills = localStorage.getItem(STORAGE_KEY_BILLS)
      
      if (savedProducts) {
        const parsed = JSON.parse(savedProducts)
        if (Array.isArray(parsed)) {
          setProducts(parsed)
        }
      }
      if (savedBills) {
        const parsed = JSON.parse(savedBills)
        if (Array.isArray(parsed)) {
          setBills(parsed)
        }
      }
    } catch (error) {
      console.error("Error loading data from localStorage:", error)
    }
    setIsLoaded(true)
  }, [])

  // Save products to localStorage when they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products))
      } catch (error) {
        console.error("Error saving products to localStorage:", error)
      }
    }
  }, [products, isLoaded])

  // Save bills to localStorage when they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(bills))
      } catch (error) {
        console.error("Error saving bills to localStorage:", error)
      }
    }
  }, [bills, isLoaded])

  const addProduct = () => {
    if (!newProductName.trim() || !newProductPrice) return

    const product: GuestProduct = {
      id: crypto.randomUUID(),
      name: newProductName.trim(),
      price: Number.parseFloat(newProductPrice),
      soldCash: 0,
      soldTransfer: 0,
    }

    setProducts([...products, product])
    setNewProductName("")
    setNewProductPrice("")
  }

  const removeProduct = (id: string) => {
    setProducts(products.filter((p) => p.id !== id))
  }

  const updateSold = (id: string, type: "cash" | "transfer", delta: number) => {
    setProducts(
      products.map((p) => {
        if (p.id !== id) return p
        if (type === "cash") {
          return { ...p, soldCash: Math.max(0, p.soldCash + delta) }
        } else {
          return { ...p, soldTransfer: Math.max(0, p.soldTransfer + delta) }
        }
      }),
    )
  }

  const updateBillCount = (denomination: number, count: number) => {
    setBills(bills.map((b) => (b.denomination === denomination ? { ...b, count: Math.max(0, count) } : b)))
  }

  // Calculate totals
  const totalCash = products.reduce((sum, p) => sum + p.soldCash * p.price, 0)
  const totalTransfer = products.reduce((sum, p) => sum + p.soldTransfer * p.price, 0)
  const totalGeneral = totalCash + totalTransfer

  // Calculate bill totals
  const totalBills = bills.reduce((sum, b) => sum + b.denomination * b.count, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Modo Invitado</h1>
          <Link href="/auth/login">
            <Button variant="outline" size="sm">
              Iniciar Sesión
            </Button>
          </Link>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="p-4 grid grid-cols-3 gap-2">
        <Card className="bg-green-500 text-white">
          <CardContent className="p-3 text-center">
            <Banknote className="h-5 w-5 mx-auto mb-1" />
            <p className="text-xs opacity-90">Efectivo</p>
            <p className="text-lg font-bold">${totalCash.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500 text-white">
          <CardContent className="p-3 text-center">
            <CreditCard className="h-5 w-5 mx-auto mb-1" />
            <p className="text-xs opacity-90">Transfer</p>
            <p className="text-lg font-bold">${totalTransfer.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-600 text-white">
          <CardContent className="p-3 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1" />
            <p className="text-xs opacity-90">Total</p>
            <p className="text-lg font-bold">${totalGeneral.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="px-4 mb-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <Button
            variant={activeTab === "products" ? "default" : "outline"}
            onClick={() => setActiveTab("products")}
            size="sm"
          >
            Productos
          </Button>
          <Button
            variant={activeTab === "stats" ? "default" : "outline"}
            onClick={() => setActiveTab("stats")}
            size="sm"
          >
            Estadísticas
          </Button>
          <Button
            variant={activeTab === "bills" ? "default" : "outline"}
            onClick={() => setActiveTab("bills")}
            size="sm"
          >
            Billetes
          </Button>
        </div>
      </div>

      <div className="px-4 pb-4">
        {/* Products Tab */}
        {activeTab === "products" && (
          <div className="space-y-4">
            {/* Add Product Form */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Agregar Producto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del producto"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Precio"
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                    className="w-24"
                    step="0.01"
                    min="0"
                  />
                </div>
                <Button onClick={addProduct} className="w-full" disabled={!newProductName.trim() || !newProductPrice}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </CardContent>
            </Card>

            {/* Products List */}
            {products.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  <p>No hay productos agregados</p>
                  <p className="text-sm">Agrega productos para comenzar a registrar ventas</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {products.map((product) => (
                  <Card key={product.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      {/* Product Header */}
                      <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{product.name}</h3>
                          <p className="text-sm text-gray-600">${product.price.toFixed(2)} c/u</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeProduct(product.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Sales Controls */}
                      <div className="p-3 grid grid-cols-2 gap-3">
                        {/* Cash */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-green-600">
                            <Banknote className="h-4 w-4" />
                            <span className="text-sm font-medium">Efectivo</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateSold(product.id, "cash", -1)}
                              className="h-10 w-10"
                            >
                              -
                            </Button>
                            <div className="flex-1 text-center">
                              <p className="text-2xl font-bold">{product.soldCash}</p>
                              <p className="text-xs text-gray-500">${(product.soldCash * product.price).toFixed(2)}</p>
                            </div>
                            <Button
                              variant="default"
                              size="icon"
                              onClick={() => updateSold(product.id, "cash", 1)}
                              className="h-10 w-10 bg-green-500 hover:bg-green-600"
                            >
                              +
                            </Button>
                          </div>
                        </div>

                        {/* Transfer */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-blue-600">
                            <CreditCard className="h-4 w-4" />
                            <span className="text-sm font-medium">Transfer</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateSold(product.id, "transfer", -1)}
                              className="h-10 w-10"
                            >
                              -
                            </Button>
                            <div className="flex-1 text-center">
                              <p className="text-2xl font-bold">{product.soldTransfer}</p>
                              <p className="text-xs text-gray-500">
                                ${(product.soldTransfer * product.price).toFixed(2)}
                              </p>
                            </div>
                            <Button
                              variant="default"
                              size="icon"
                              onClick={() => updateSold(product.id, "transfer", 1)}
                              className="h-10 w-10 bg-blue-500 hover:bg-blue-600"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Product Total */}
                      <div className="px-3 pb-3">
                        <div className="bg-purple-50 rounded-lg p-2 text-center">
                          <span className="text-sm text-purple-600">Total producto: </span>
                          <span className="font-bold text-purple-700">
                            ${((product.soldCash + product.soldTransfer) * product.price).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === "stats" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Estadísticas Generales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary by payment type */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <Banknote className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="text-sm text-green-700 font-medium">Total Efectivo</p>
                    <p className="text-2xl font-bold text-green-800">${totalCash.toFixed(2)}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {products.reduce((sum, p) => sum + p.soldCash, 0)} unidades
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-blue-700 font-medium">Total Transferencia</p>
                    <p className="text-2xl font-bold text-blue-800">${totalTransfer.toFixed(2)}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      {products.reduce((sum, p) => sum + p.soldTransfer, 0)} unidades
                    </p>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="bg-purple-100 rounded-lg p-4 text-center">
                  <DollarSign className="h-10 w-10 mx-auto mb-2 text-purple-600" />
                  <p className="text-lg text-purple-700 font-medium">Total General</p>
                  <p className="text-3xl font-bold text-purple-800">${totalGeneral.toFixed(2)}</p>
                  <p className="text-sm text-purple-600 mt-1">
                    {products.reduce((sum, p) => sum + p.soldCash + p.soldTransfer, 0)} unidades vendidas
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Per Product Statistics */}
            {products.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detalle por Producto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {products.map((product) => (
                      <div key={product.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-semibold">{product.name}</h4>
                          <span className="text-sm text-gray-500">${product.price.toFixed(2)}/u</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                          <div className="bg-green-50 rounded p-2">
                            <p className="text-green-600 font-medium">{product.soldCash}</p>
                            <p className="text-xs text-green-700">${(product.soldCash * product.price).toFixed(2)}</p>
                            <p className="text-xs text-gray-500">Efectivo</p>
                          </div>
                          <div className="bg-blue-50 rounded p-2">
                            <p className="text-blue-600 font-medium">{product.soldTransfer}</p>
                            <p className="text-xs text-blue-700">
                              ${(product.soldTransfer * product.price).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">Transfer</p>
                          </div>
                          <div className="bg-purple-50 rounded p-2">
                            <p className="text-purple-600 font-medium">{product.soldCash + product.soldTransfer}</p>
                            <p className="text-xs text-purple-700">
                              ${((product.soldCash + product.soldTransfer) * product.price).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">Total</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Bills Tab */}
        {activeTab === "bills" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  Declaración de Billetes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bills.map((bill) => (
                  <div key={bill.denomination} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="w-14 flex-shrink-0 text-center">
                        <span className="font-bold text-gray-700 text-sm">${bill.denomination}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateBillCount(bill.denomination, bill.count - 1)}
                          className="h-8 w-8"
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          value={bill.count === 0 ? "" : bill.count}
                          onChange={(e) => updateBillCount(bill.denomination, Number.parseInt(e.target.value) || 0)}
                          onBlur={(e) => {
                            if (e.target.value === "") {
                              updateBillCount(bill.denomination, 0)
                            }
                          }}
                          className="w-16 text-center"
                          min="0"
                          placeholder="0"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateBillCount(bill.denomination, bill.count + 1)}
                          className="h-8 w-8"
                        >
                          +
                        </Button>
                      </div>
                      <div className="flex-1 text-right min-w-0">
                        <span className="font-medium text-green-600 text-sm truncate block">
                          ${(bill.denomination * bill.count).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bills Total */}
            <Card className="bg-green-500 text-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-lg opacity-90">Total en Billetes</p>
                  <p className="text-4xl font-bold">${totalBills.toLocaleString()}</p>
                  <p className="text-sm opacity-75 mt-2">
                    {bills.reduce((sum, b) => sum + b.count, 0)} billetes totales
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Comparison with Cash Sales */}
            {totalCash > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-gray-600">Comparación con ventas en efectivo</p>
                    <div className="flex items-center justify-center gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Billetes</p>
                        <p className="font-bold text-green-600">${totalBills.toLocaleString()}</p>
                      </div>
                      <span className="text-gray-400">vs</span>
                      <div>
                        <p className="text-xs text-gray-500">Ventas Efectivo</p>
                        <p className="font-bold text-blue-600">${totalCash.toFixed(2)}</p>
                      </div>
                    </div>
                    <div
                      className={`text-sm font-medium ${totalBills === totalCash ? "text-green-600" : "text-orange-600"}`}
                    >
                      {totalBills === totalCash
                        ? "Los montos coinciden"
                        : `Diferencia: $${Math.abs(totalBills - totalCash).toLocaleString()}`}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
