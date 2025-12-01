"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Banknote, CreditCard, Package, TrendingUp, LogOut, DollarSign, Calculator, ShoppingCart, Check, Clock, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { Product, Sale, IPV } from "@/lib/types"

interface BillCount {
  denomination: number
  count: number
}

interface PendingPayment {
  id: string
  items: { product: Product; quantity: number }[]
  paymentMethod: "cash" | "transfer"
  total: number
  status: "pending" | "confirmed"
}

export function SalesInterface({
  ipv,
  initialProducts,
  userId,
}: {
  ipv: IPV
  initialProducts: Product[]
  userId: string
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [sales, setSales] = useState<Sale[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map())
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"cash" | "transfer" | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"products" | "pending" | "stats" | "bills">("products")
  const router = useRouter()
  const supabase = createClient()

  // Bill denominations (local state - same as guest mode)
  const [bills, setBills] = useState<BillCount[]>([
    { denomination: 1000, count: 0 },
    { denomination: 500, count: 0 },
    { denomination: 200, count: 0 },
    { denomination: 100, count: 0 },
    { denomination: 50, count: 0 },
    { denomination: 20, count: 0 },
    { denomination: 10, count: 0 },
    { denomination: 5, count: 0 },
    { denomination: 1, count: 0 },
  ])

  // Load sales data
  useEffect(() => {
    loadSales()
  }, [])

  const loadSales = async () => {
    const { data } = await supabase
      .from("sales")
      .select("*")
      .eq("ipv_id", ipv.id)
      .order("created_at", { ascending: false })

    if (data) {
      setSales(data)
    }
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
    const product = products.find(p => p.id === productId)
    if (!product) return
    
    const newSelected = new Map(selectedProducts)
    if (quantity <= 0) {
      newSelected.delete(productId)
    } else {
      newSelected.set(productId, Math.min(quantity, product.current_stock))
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

    const items: { product: Product; quantity: number }[] = []
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
    
    // Update local product stock temporarily
    setProducts(prev => 
      prev.map(p => {
        const selectedQty = selectedProducts.get(p.id)
        if (selectedQty) {
          return { ...p, current_stock: p.current_stock - selectedQty }
        }
        return p
      })
    )

    // Reset selection
    setSelectedProducts(new Map())
    setSelectedPaymentMethod(null)
    setIsDialogOpen(false)
  }

  // Confirm pending payment - save to database
  const confirmPayment = async (paymentId: string) => {
    const payment = pendingPayments.find(p => p.id === paymentId)
    if (!payment || isLoading) return

    setIsLoading(true)

    try {
      // Insert sales for each item
      for (const item of payment.items) {
        const { error } = await supabase.from("sales").insert({
          product_id: item.product.id,
          ipv_id: ipv.id,
          user_id: userId,
          quantity: item.quantity,
          payment_method: payment.paymentMethod,
          unit_price: item.product.price,
          total_amount: item.product.price * item.quantity,
        })

        if (error) throw error
      }

      // Update payment status
      setPendingPayments(prev => 
        prev.map(p => p.id === paymentId ? { ...p, status: "confirmed" as const } : p)
      )

      // Remove confirmed payment after a short delay
      setTimeout(() => {
        setPendingPayments(prev => prev.filter(p => p.id !== paymentId))
      }, 1500)

      // Reload sales
      await loadSales()
    } catch (error) {
      console.error("Error confirmando pago:", error)
      toast.error("Error al confirmar el pago")
    } finally {
      setIsLoading(false)
    }
  }

  // Cancel pending payment - restore stock
  const cancelPendingPayment = (paymentId: string) => {
    const payment = pendingPayments.find(p => p.id === paymentId)
    if (!payment) return

    // Restore stock
    setProducts(prev => 
      prev.map(p => {
        const item = payment.items.find(i => i.product.id === p.id)
        if (item) {
          return { ...p, current_stock: p.current_stock + item.quantity }
        }
        return p
      })
    )

    // Remove payment
    setPendingPayments(prev => prev.filter(p => p.id !== paymentId))
  }

  // Open dialog for payment method selection
  const openPaymentDialog = () => {
    if (selectedProducts.size === 0) {
      toast.warning("Selecciona al menos un producto")
      return
    }
    setIsDialogOpen(true)
  }

  const updateBillCount = (denomination: number, count: number) => {
    setBills(bills.map((b) => (b.denomination === denomination ? { ...b, count: Math.max(0, count) } : b)))
  }

  // Calculate totals
  const totalCash = sales.filter((s) => s.payment_method === "cash").reduce((sum, s) => sum + Number(s.total_amount), 0)

  const totalTransfer = sales
    .filter((s) => s.payment_method === "transfer")
    .reduce((sum, s) => sum + Number(s.total_amount), 0)

  const totalGeneral = totalCash + totalTransfer

  // Calculate bill totals
  const totalBills = bills.reduce((sum, b) => sum + b.denomination * b.count, 0)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{ipv.name}</h1>
            <p className="text-xs text-gray-500">{ipv.description}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-600">
            <LogOut className="h-5 w-5" />
          </Button>
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
      <div className="px-4 flex gap-2 mb-4">
        <Button
          variant={activeTab === "products" ? "default" : "outline"}
          onClick={() => setActiveTab("products")}
          className="flex-1"
          size="sm"
        >
          Productos
        </Button>
        <Button
          variant={activeTab === "pending" ? "default" : "outline"}
          onClick={() => setActiveTab("pending")}
          className="flex-1 relative"
          size="sm"
        >
          Pendientes
          {pendingPayments.length > 0 && (
            <Badge className="ml-1 bg-orange-500">{pendingPayments.length}</Badge>
          )}
        </Button>
        <Button
          variant={activeTab === "stats" ? "default" : "outline"}
          onClick={() => setActiveTab("stats")}
          className="flex-1"
          size="sm"
        >
          Estadísticas
        </Button>
        <Button
          variant={activeTab === "bills" ? "default" : "outline"}
          onClick={() => setActiveTab("bills")}
          className="flex-1"
          size="sm"
        >
          Billetes
        </Button>
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
                      ${calculateSelectedTotal().toFixed(2)}
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

            {/* Products List */}
            {products.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  <p>No hay productos en este inventario</p>
                  <p className="text-sm">Contacta al administrador para agregar productos</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {products.map((product) => {
                  const isSelected = selectedProducts.has(product.id)
                  const selectedQty = selectedProducts.get(product.id) || 0
                  
                  return (
                    <Card 
                      key={product.id} 
                      className={`p-4 bg-white transition-shadow ${
                        isSelected ? 'ring-2 ring-purple-500 shadow-md' : 'hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className="pt-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleProductSelection(product.id)}
                            disabled={product.current_stock <= 0}
                            className="h-5 w-5"
                          />
                        </div>
                        
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                          <p className="text-lg font-bold text-blue-600">${product.price.toFixed(2)}</p>
                          <div className="flex gap-3 mt-2 text-xs">
                            <span className="text-gray-600">
                              Entrante: <span className="font-semibold">{product.initial_stock}</span>
                            </span>
                            <span className="text-gray-600">
                              Vendidos:{" "}
                              <span className="font-semibold text-green-600">
                                {product.initial_stock - product.current_stock}
                              </span>
                            </span>
                            <span className="text-gray-600">
                              Restante:{" "}
                              <Badge variant={product.current_stock > 5 ? "default" : "destructive"} className="text-xs">
                                {product.current_stock}
                              </Badge>
                            </span>
                          </div>
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
                              disabled={selectedQty >= product.current_stock}
                              className="h-8 w-8"
                            >
                              +
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Pending Payments Tab */}
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
                          ${payment.total.toFixed(2)}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="space-y-1 mb-3">
                        {payment.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.product.name} x{item.quantity}</span>
                            <span className="font-medium">${(item.product.price * item.quantity).toFixed(2)}</span>
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
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Cancelar
                          </Button>
                          <Button
                            onClick={() => confirmPayment(payment.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            disabled={isLoading}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            {isLoading ? "Procesando..." : "Confirmar"}
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
                      {sales.filter((s) => s.payment_method === "cash").reduce((sum, s) => sum + s.quantity, 0)} unidades
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-blue-700 font-medium">Total Transferencia</p>
                    <p className="text-2xl font-bold text-blue-800">${totalTransfer.toFixed(2)}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      {sales.filter((s) => s.payment_method === "transfer").reduce((sum, s) => sum + s.quantity, 0)} unidades
                    </p>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="bg-purple-100 rounded-lg p-4 text-center">
                  <DollarSign className="h-10 w-10 mx-auto mb-2 text-purple-600" />
                  <p className="text-lg text-purple-700 font-medium">Total General</p>
                  <p className="text-3xl font-bold text-purple-800">${totalGeneral.toFixed(2)}</p>
                  <p className="text-sm text-purple-600 mt-1">
                    {sales.reduce((sum, s) => sum + s.quantity, 0)} unidades vendidas
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
                    {products.map((product) => {
                      const productSales = sales.filter((s) => s.product_id === product.id)
                      const cashSales = productSales.filter((s) => s.payment_method === "cash")
                      const transferSales = productSales.filter((s) => s.payment_method === "transfer")
                      const cashQuantity = cashSales.reduce((sum, s) => sum + s.quantity, 0)
                      const transferQuantity = transferSales.reduce((sum, s) => sum + s.quantity, 0)
                      const cashAmount = cashSales.reduce((sum, s) => sum + Number(s.total_amount), 0)
                      const transferAmount = transferSales.reduce((sum, s) => sum + Number(s.total_amount), 0)

                      return (
                        <div key={product.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold">{product.name}</h4>
                            <span className="text-sm text-gray-500">${product.price.toFixed(2)}/u</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center text-sm">
                            <div className="bg-green-50 rounded p-2">
                              <p className="text-green-600 font-medium">{cashQuantity}</p>
                              <p className="text-xs text-green-700">${cashAmount.toFixed(2)}</p>
                              <p className="text-xs text-gray-500">Efectivo</p>
                            </div>
                            <div className="bg-blue-50 rounded p-2">
                              <p className="text-blue-600 font-medium">{transferQuantity}</p>
                              <p className="text-xs text-blue-700">${transferAmount.toFixed(2)}</p>
                              <p className="text-xs text-gray-500">Transfer</p>
                            </div>
                            <div className="bg-purple-50 rounded p-2">
                              <p className="text-purple-600 font-medium">{cashQuantity + transferQuantity}</p>
                              <p className="text-xs text-purple-700">${(cashAmount + transferAmount).toFixed(2)}</p>
                              <p className="text-xs text-gray-500">Total</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
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
                    <div key={bill.denomination} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      <div className="w-16 text-center">
                        <span className="font-bold text-gray-700">${bill.denomination}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
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
                          value={bill.count}
                          onChange={(e) => updateBillCount(bill.denomination, Number.parseInt(e.target.value) || 0)}
                          className="w-20 text-center"
                          min="0"
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
                      <div className="w-24 text-right">
                        <span className="font-medium text-green-600">
                          ${(bill.denomination * bill.count).toFixed(2)}
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
                  <p className="text-4xl font-bold">${totalBills.toFixed(2)}</p>
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
                        <p className="font-bold text-green-600">${totalBills.toFixed(2)}</p>
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
                        : `Diferencia: $${Math.abs(totalBills - totalCash).toFixed(2)}`}
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Seleccionar Método de Pago</DialogTitle>
            <DialogDescription>
              Total a pagar: ${calculateSelectedTotal().toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Selected Products Summary */}
            <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
              {Array.from(selectedProducts).map(([productId, quantity]) => {
                const product = products.find(p => p.id === productId)
                if (!product) return null
                return (
                  <div key={productId} className="flex justify-between">
                    <span>{product.name} x{quantity}</span>
                    <span className="font-medium">${(product.price * quantity).toFixed(2)}</span>
                  </div>
                )
              })}
            </div>

            {/* Payment Method Selection */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={selectedPaymentMethod === "cash" ? "default" : "outline"}
                onClick={() => setSelectedPaymentMethod("cash")}
                className={`h-20 flex-col ${
                  selectedPaymentMethod === "cash" ? "bg-green-600 hover:bg-green-700" : ""
                }`}
              >
                <Banknote className="h-8 w-8 mb-1" />
                <span>Efectivo</span>
              </Button>
              <Button
                variant={selectedPaymentMethod === "transfer" ? "default" : "outline"}
                onClick={() => setSelectedPaymentMethod("transfer")}
                className={`h-20 flex-col ${
                  selectedPaymentMethod === "transfer" ? "bg-blue-600 hover:bg-blue-700" : ""
                }`}
              >
                <CreditCard className="h-8 w-8 mb-1" />
                <span>Transferencia</span>
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
