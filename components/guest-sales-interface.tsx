"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Banknote, CreditCard, DollarSign, Calculator, Clock, ShoppingCart, Check } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"

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

interface PendingPayment {
  id: string
  items: { product: GuestProduct; quantity: number }[]
  paymentMethod: "cash" | "transfer"
  total: number
  status: "pending" | "confirmed"
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
  const [activeTab, setActiveTab] = useState<"products" | "pending" | "history" | "stats" | "bills">("products")
  const [isLoaded, setIsLoaded] = useState(false)

  // Checkbox purchase system state
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map())
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"cash" | "transfer" | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

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

  const updateBillCount = (denomination: number, count: number) => {
    setBills(bills.map((b) => (b.denomination === denomination ? { ...b, count: Math.max(0, count) } : b)))
  }

  // Toggle product selection
  const toggleProductSelection = (productId: string) => {
    const newSelected = new Map(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.set(productId, 1)
    }
    setSelectedProducts(newSelected)
  }

  // Update quantity for a selected product
  const updateProductQuantity = (productId: string, quantity: number) => {
    const newSelected = new Map(selectedProducts)
    if (quantity <= 0) {
      newSelected.delete(productId)
    } else {
      newSelected.set(productId, quantity)
    }
    setSelectedProducts(newSelected)
  }

  // Calculate total for selected products
  const calculateSelectedTotal = () => {
    let total = 0
    selectedProducts.forEach((quantity, productId) => {
      const product = products.find(p => p.id === productId)
      if (product) {
        total += product.price * quantity
      }
    })
    return total
  }

  // Create pending payment
  const createPendingPayment = () => {
    if (selectedProducts.size === 0 || !selectedPaymentMethod) return

    const items: { product: GuestProduct; quantity: number }[] = []
    selectedProducts.forEach((quantity, productId) => {
      const product = products.find(p => p.id === productId)
      if (product) {
        items.push({ product, quantity })
      }
    })

    const newPayment: PendingPayment = {
      id: crypto.randomUUID(),
      items,
      paymentMethod: selectedPaymentMethod,
      total: calculateSelectedTotal(),
      status: "pending"
    }

    setPendingPayments([...pendingPayments, newPayment])

    // Reset selection
    setSelectedProducts(new Map())
    setSelectedPaymentMethod(null)
    setIsDialogOpen(false)

    toast.success("Pago agregado a pendientes")
  }

  // Confirm pending payment
  const confirmPayment = (paymentId: string) => {
    const payment = pendingPayments.find(p => p.id === paymentId)
    if (!payment) return

    // Add sales to products
    setProducts(prev =>
      prev.map(p => {
        const item = payment.items.find(i => i.product.id === p.id)
        if (item) {
          if (payment.paymentMethod === "cash") {
            return { ...p, soldCash: p.soldCash + item.quantity }
          } else {
            return { ...p, soldTransfer: p.soldTransfer + item.quantity }
          }
        }
        return p
      })
    )

    // Update payment status
    setPendingPayments(prev =>
      prev.map(p => p.id === paymentId ? { ...p, status: "confirmed" as const } : p)
    )

    // Remove confirmed payment after a short delay
    setTimeout(() => {
      setPendingPayments(prev => prev.filter(p => p.id !== paymentId))
    }, 1500)

    toast.success("Pago confirmado")
  }

  // Cancel pending payment
  const cancelPendingPayment = (paymentId: string) => {
    setPendingPayments(prev => prev.filter(p => p.id !== paymentId))
    toast.info("Pago cancelado")
  }

  // Open dialog for payment method selection
  const openPaymentDialog = () => {
    if (selectedProducts.size === 0) {
      toast.warning("Selecciona al menos un producto")
      return
    }
    setIsDialogOpen(true)
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
            <p className="text-lg font-bold">${formatCurrency(totalCash)}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500 text-white">
          <CardContent className="p-3 text-center">
            <CreditCard className="h-5 w-5 mx-auto mb-1" />
            <p className="text-xs opacity-90">Transfer</p>
            <p className="text-lg font-bold">${formatCurrency(totalTransfer)}</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-600 text-white">
          <CardContent className="p-3 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1" />
            <p className="text-xs opacity-90">Total</p>
            <p className="text-lg font-bold">${formatCurrency(totalGeneral)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="px-4 mb-4 bg-gray-50 sticky top-[57px] z-20 py-3 -mt-3">
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={activeTab === "products" ? "default" : "outline"}
            onClick={() => setActiveTab("products")}
            size="sm"
          >
            Productos
          </Button>
          <Button
            variant={activeTab === "pending" ? "default" : "outline"}
            onClick={() => setActiveTab("pending")}
            className="relative"
            size="sm"
          >
            Pendientes
            {pendingPayments.length > 0 && (
              <Badge className="ml-1 bg-orange-500">{pendingPayments.length}</Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            onClick={() => setActiveTab("history")}
            size="sm"
          >
            Historial
          </Button>
          <Button
            variant={activeTab === "stats" ? "default" : "outline"}
            onClick={() => setActiveTab("stats")}
            size="sm"
            className="col-span-1"
          >
            Estadísticas
          </Button>
          <Button
            variant={activeTab === "bills" ? "default" : "outline"}
            onClick={() => setActiveTab("bills")}
            size="sm"
            className="col-span-2"
          >
            Billetes
          </Button>
        </div>
      </div>

      <div className="px-4 pb-4">
        {/* Products Tab */}
        {activeTab === "products" && (
          <div className="space-y-4">
            {/* Selected Products Summary - Fixed at top */}
            {selectedProducts.size > 0 && (
              <Card className="bg-purple-50 border-purple-200 sticky top-[76px] z-10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-purple-600" />
                      <span className="font-semibold text-purple-800">
                        {selectedProducts.size} producto(s) seleccionado(s)
                      </span>
                    </div>
                    <span className="text-xl font-bold text-purple-700">
                      ${formatCurrency(calculateSelectedTotal())}
                    </span>
                  </div>
                  <Button 
                    onClick={openPaymentDialog}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    Procesar Pago
                  </Button>
                </CardContent>
              </Card>
            )}

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
                {products.map((product) => {
                  const isSelected = selectedProducts.has(product.id)
                  const selectedQty = selectedProducts.get(product.id) || 0

                  return (
                    <Card 
                      key={product.id} 
                      className={`overflow-hidden transition-shadow ${
                        isSelected ? 'ring-2 ring-purple-500 shadow-md' : ''
                      }`}
                    >
                      <CardContent className="p-0">
                        {/* Product Header with Checkbox */}
                        <div className="p-3 bg-gray-50 border-b flex items-start gap-3">
                          {/* Checkbox for selection */}
                          <div className="pt-1">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleProductSelection(product.id)}
                              className="h-5 w-5"
                            />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900">{product.name}</h3>
                            <p className="text-sm text-gray-600">${formatCurrency(product.price)} c/u</p>
                          </div>

                          {/* Quantity Controls (when selected) */}
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => updateProductQuantity(product.id, selectedQty - 1)}
                                className="h-8 w-8"
                              >
                                -
                              </Button>
                              <span className="w-8 text-center font-bold">{selectedQty}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => updateProductQuantity(product.id, selectedQty + 1)}
                                className="h-8 w-8"
                              >
                                +
                              </Button>
                            </div>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeProduct(product.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Sales Summary & Direct Controls */}
                        <div className="p-3 space-y-3">
                          {/* Current Sales Display */}
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="bg-green-50 rounded p-2">
                              <p className="text-green-600 font-medium">{product.soldCash}</p>
                              <p className="text-xs text-gray-500">Efectivo</p>
                            </div>
                            <div className="bg-blue-50 rounded p-2">
                              <p className="text-blue-600 font-medium">{product.soldTransfer}</p>
                              <p className="text-xs text-gray-500">Transfer</p>
                            </div>
                            <div className="bg-purple-50 rounded p-2">
                              <p className="text-purple-600 font-medium">{product.soldCash + product.soldTransfer}</p>
                              <p className="text-xs text-gray-500">Total</p>
                            </div>
                          </div>

                          {/* Product Total */}
                          <div className="bg-purple-50 rounded-lg p-2 text-center">
                            <span className="text-sm text-purple-600">Total vendido: </span>
                            <span className="font-bold text-purple-700">
                              ${formatCurrency((product.soldCash + product.soldTransfer) * product.price)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Pending Tab */}
        {activeTab === "pending" && (
          <div className="space-y-4">
            {pendingPayments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  <Clock className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                  <p>No hay pagos pendientes</p>
                  <p className="text-sm">Selecciona productos para crear un nuevo pago</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingPayments.map((payment) => (
                  <Card 
                    key={payment.id} 
                    className={`overflow-hidden ${
                      payment.status === "confirmed" ? "bg-green-50 border-green-300" : "bg-orange-50 border-orange-200"
                    }`}
                  >
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {payment.status === "confirmed" ? (
                            <Check className="h-5 w-5 text-green-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-orange-600" />
                          )}
                          <Badge 
                            className={payment.status === "confirmed" ? "bg-green-500" : "bg-orange-500"}
                          >
                            {payment.status === "confirmed" ? "Confirmado" : "Pendiente"}
                          </Badge>
                          <Badge 
                            className={payment.paymentMethod === "cash" ? "bg-green-600" : "bg-blue-600"}
                          >
                            {payment.paymentMethod === "cash" ? (
                              <><Banknote className="h-3 w-3 mr-1" />Efectivo</>
                            ) : (
                              <><CreditCard className="h-3 w-3 mr-1" />Transfer</>
                            )}
                          </Badge>
                        </div>
                        <span className="text-xl font-bold">
                          ${formatCurrency(payment.total)}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="space-y-1 mb-3">
                        {payment.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.product.name} x{item.quantity}</span>
                            <span className="font-medium">${formatCurrency(item.product.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      {payment.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => cancelPendingPayment(payment.id)}
                            className="flex-1"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Cancelar
                          </Button>
                          <Button
                            onClick={() => confirmPayment(payment.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Confirmar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Historial de Ventas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="py-8 text-center text-gray-500">
                  <Clock className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                  <p>El historial no está disponible en modo invitado</p>
                  <p className="text-sm mt-2">Las ventas no se guardan permanentemente en este modo.</p>
                  <p className="text-sm">Para acceder al historial completo, inicia sesión con tu cuenta.</p>
                </div>
              </CardContent>
            </Card>
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
                    <p className="text-2xl font-bold text-green-800">${formatCurrency(totalCash)}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {products.reduce((sum, p) => sum + p.soldCash, 0)} unidades
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-blue-700 font-medium">Total Transferencia</p>
                    <p className="text-2xl font-bold text-blue-800">${formatCurrency(totalTransfer)}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      {products.reduce((sum, p) => sum + p.soldTransfer, 0)} unidades
                    </p>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="bg-purple-100 rounded-lg p-4 text-center">
                  <DollarSign className="h-10 w-10 mx-auto mb-2 text-purple-600" />
                  <p className="text-lg text-purple-700 font-medium">Total General</p>
                  <p className="text-3xl font-bold text-purple-800">${formatCurrency(totalGeneral)}</p>
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
                          <span className="text-sm text-gray-500">${formatCurrency(product.price)}/u</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                          <div className="bg-green-50 rounded p-2">
                            <p className="text-green-600 font-medium">{product.soldCash}</p>
                            <p className="text-xs text-green-700">${formatCurrency(product.soldCash * product.price)}</p>
                            <p className="text-xs text-gray-500">Efectivo</p>
                          </div>
                          <div className="bg-blue-50 rounded p-2">
                            <p className="text-blue-600 font-medium">{product.soldTransfer}</p>
                            <p className="text-xs text-blue-700">
                              ${formatCurrency(product.soldTransfer * product.price)}
                            </p>
                            <p className="text-xs text-gray-500">Transfer</p>
                          </div>
                          <div className="bg-purple-50 rounded p-2">
                            <p className="text-purple-600 font-medium">{product.soldCash + product.soldTransfer}</p>
                            <p className="text-xs text-purple-700">
                              ${formatCurrency((product.soldCash + product.soldTransfer) * product.price)}
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
                        <p className="font-bold text-blue-600">${formatCurrency(totalCash)}</p>
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

      {/* Payment Method Selection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Seleccionar Método de Pago</DialogTitle>
            <DialogDescription>
              Total a pagar: ${formatCurrency(calculateSelectedTotal())}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Selected Products Summary */}
            <div 
              className="max-h-32 overflow-y-auto space-y-1 text-sm border rounded-md p-2 bg-gray-50"
              role="list"
              aria-label="Productos seleccionados"
            >
              {Array.from(selectedProducts).map(([productId, quantity]) => {
                const product = products.find(p => p.id === productId)
                if (!product) return null
                return (
                  <div key={productId} className="flex justify-between">
                    <span>{product.name} x{quantity}</span>
                    <span className="font-medium">${formatCurrency(product.price * quantity)}</span>
                  </div>
                )
              })}
            </div>

            {/* Payment Method Selection */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={selectedPaymentMethod === "cash" ? "default" : "outline"}
                onClick={() => setSelectedPaymentMethod("cash")}
                className={`h-16 flex-col ${
                  selectedPaymentMethod === "cash" ? "bg-green-600 hover:bg-green-700" : ""
                }`}
              >
                <Banknote className="h-6 w-6 mb-1" />
                <span className="text-sm">Efectivo</span>
              </Button>
              <Button
                variant={selectedPaymentMethod === "transfer" ? "default" : "outline"}
                onClick={() => setSelectedPaymentMethod("transfer")}
                className={`h-16 flex-col ${
                  selectedPaymentMethod === "transfer" ? "bg-blue-600 hover:bg-blue-700" : ""
                }`}
              >
                <CreditCard className="h-6 w-6 mb-1" />
                <span className="text-sm">Transferencia</span>
              </Button>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false)
                  setSelectedPaymentMethod(null)
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={createPendingPayment}
                disabled={!selectedPaymentMethod}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                <Clock className="h-4 w-4 mr-1" />
                Agregar Pendiente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
