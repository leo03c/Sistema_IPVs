"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Banknote, CreditCard, LogOut, DollarSign, Calculator, ShoppingCart, Check, Clock, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"

interface Product {
  id: string
  name: string
  price: number
  initial_stock: number
  current_stock: number
}

interface PendingPayment {
  id: string
  items: { product: Product; quantity: number }[]
  paymentMethod: "cash" | "transfer"
  total: number
  status: "pending" | "confirmed"
}

// Demo products
const initialDemoProducts: Product[] = [
  { id: "1", name: "Hamburguesa Clásica", price: 85.00, initial_stock: 50, current_stock: 45 },
  { id: "2", name: "Hot Dog", price: 45.00, initial_stock: 60, current_stock: 55 },
  { id: "3", name: "Papas Fritas", price: 35.00, initial_stock: 100, current_stock: 88 },
  { id: "4", name: "Refresco", price: 25.00, initial_stock: 200, current_stock: 180 },
  { id: "5", name: "Agua", price: 15.00, initial_stock: 150, current_stock: 140 },
]

export default function DemoPage() {
  const [products, setProducts] = useState<Product[]>(initialDemoProducts)
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map())
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"cash" | "transfer" | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"products" | "pending" | "history" | "stats" | "bills">("products")

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

  // Confirm pending payment
  const confirmPayment = async (paymentId: string) => {
    setIsLoading(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))

    // Update payment status
    setPendingPayments(prev => 
      prev.map(p => p.id === paymentId ? { ...p, status: "confirmed" as const } : p)
    )

    // Remove confirmed payment after a short delay
    setTimeout(() => {
      setPendingPayments(prev => prev.filter(p => p.id !== paymentId))
    }, 1500)

    setIsLoading(false)
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

  // Calculate totals for stats
  const totalCash = 0
  const totalTransfer = 0
  const totalGeneral = totalCash + totalTransfer

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Demo - Nueva Interfaz de Ventas</h1>
            <p className="text-xs text-gray-500">Prueba la selección con checkboxes y pagos pendientes</p>
          </div>
          <Button variant="ghost" size="icon" className="text-gray-600">
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
      <div className="px-4 mb-4">
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

            {/* Products List */}
            <div className="space-y-2">
              {products.map((product) => {
                const isSelected = selectedProducts.has(product.id)
                const selectedQty = selectedProducts.get(product.id) || 0
                
                return (
                  <Card 
                    key={product.id} 
                    className={`p-4 bg-white transition-shadow ${
                      isSelected ? 'ring-2 ring-purple-500 shadow-md' : 'hover:shadow-md'
                    } ${product.current_stock <= 0 ? 'opacity-50' : ''}`}
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
                        <p className="text-lg font-bold text-blue-600">${formatCurrency(product.price)}</p>
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
                  <p>No hay ventas registradas</p>
                  <p className="text-sm">Esta es una demostración. En modo real, el historial aparecerá aquí.</p>
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
                <div className="text-center text-gray-500">
                  <p>Las estadísticas se mostrarán aquí</p>
                </div>
              </CardContent>
            </Card>
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
              <CardContent className="space-y-4">
                <div className="text-center text-gray-500">
                  <p>La declaración de billetes se mostrará aquí</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Payment Method Selection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Seleccionar Método de Pago</DialogTitle>
            <DialogDescription>
              Total a pagar: ${formatCurrency(calculateSelectedTotal())}
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
