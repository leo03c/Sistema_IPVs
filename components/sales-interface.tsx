"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Banknote, CreditCard, Package, TrendingUp, LogOut, DollarSign, Calculator, ShoppingCart, Check, Clock, Trash2, ArrowLeft, Lock, FileDown, Save, ChevronDown, ChevronUp } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import type { Product, Sale, IPV } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { exportReportToPDF, type BillCount, type ReportData } from "@/lib/pdf-export"
import { PDFExportModal } from "@/components/pdf-export-modal"
import { usePreventLoginBack } from "@/lib/hooks/use-prevent-login-back"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

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
  onBack,
}: {
  ipv: IPV
  initialProducts: Product[]
  userId: string
  onBack?: () => void
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [sales, setSales] = useState<Sale[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map())
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"cash" | "transfer" | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<string | null>(null)
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [isOutOfStockOpen, setIsOutOfStockOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  // Prevent navigating back to login page
  usePreventLoginBack()
  
  // Initialize activeTab from URL params (same pattern as AdminPanel)
  const initialActiveTab = (searchParams.get("tab") as "products" | "pending" | "stats" | "bills" | "history") || "products"
  const [activeTab, setActiveTab] = useState<"products" | "pending" | "stats" | "bills" | "history">(initialActiveTab)

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

  // Mark that we are on the client side to prevent hydration mismatches during SSR
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load sales data and denominations
  useEffect(() => {
    loadSales()
    loadDenominations()
  }, [])

  // Update URL when tab changes (only on client side)
  useEffect(() => {
    if (!isClient) return
    
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.set("ipv", ipv.id)
    newParams.set("tab", activeTab)
    router.replace(`?${newParams.toString()}`, { scroll: false })
  }, [activeTab, isClient, searchParams, router, ipv.id])

  const loadSales = async () => {
    const { data } = await supabase
      .from("sales")
      . select("*")
      .eq("ipv_id", ipv. id)
      . order("created_at", { ascending: false })

    if (data) {
      setSales(data)
    }
  }

  const loadDenominations = async () => {
    const { data, error } = await supabase
      . from("denominations")
      .select("*")
      . eq("ipv_id", ipv. id)
      . eq("user_id", userId)

    if (error) {
      console.error("Error loading denominations:", error)
      return
    }

    if (data && data.length > 0) {
      setBills(prevBills => 
        prevBills.map(bill => {
          const found = data.find(d => d.denomination === bill.denomination)
          return found ?  { ...bill, count: found.count } : bill
        })
      )
    }
  }

  const toggleProductSelection = (productId: string) => {
    const newSelected = new Map(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.set(productId, 1)
    }
    setSelectedProducts(newSelected)
  }

  const updateProductQuantity = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId)
    if (! product) return
    
    const newSelected = new Map(selectedProducts)
    if (quantity <= 0) {
      newSelected.delete(productId)
    } else {
      newSelected.set(productId, Math.min(quantity, product. current_stock))
    }
    setSelectedProducts(newSelected)
  }

  const calculateSelectedTotal = () => {
    let total = 0
    selectedProducts.forEach((quantity, productId) => {
      const product = products. find(p => p.id === productId)
      if (product) {
        total += product.price * quantity
      }
    })
    return total
  }

  const createPendingPayment = () => {
    if (selectedProducts.size === 0 || !selectedPaymentMethod) return

    const items: { product: Product; quantity: number }[] = []
    selectedProducts.forEach((quantity, productId) => {
      const product = products.find(p => p. id === productId)
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
    
    setProducts(prev => 
      prev.map(p => {
        const selectedQty = selectedProducts. get(p.id)
        if (selectedQty) {
          return { ...p, current_stock: p.current_stock - selectedQty }
        }
        return p
      })
    )

    setSelectedProducts(new Map())
    setSelectedPaymentMethod(null)
    setIsDialogOpen(false)
  }

  const confirmPayment = async (paymentId: string) => {
    const payment = pendingPayments.find(p => p.id === paymentId)
    if (!payment || confirmingPaymentId) return

    setConfirmingPaymentId(paymentId)

    try {
      for (const item of payment.items) {
        const { error } = await supabase. from("sales"). insert({
          product_id: item. product.id,
          ipv_id: ipv.id,
          user_id: userId,
          quantity: item.quantity,
          payment_method: payment.paymentMethod,
          unit_price: item. product.price,
          total_amount: item.product.price * item. quantity,
        })

        if (error) throw error
      }

      setPendingPayments(prev => 
        prev.map(p => p.id === paymentId ? { ...p, status: "confirmed" as const } : p)
      )

      setTimeout(() => {
        setPendingPayments(prev => prev.filter(p => p. id !== paymentId))
      }, 1500)

      await loadSales()
    } catch (error) {
      console. error("Error confirmando pago:", error)
      toast.error("Error al confirmar el pago")
    } finally {
      setConfirmingPaymentId(null)
    }
  }

  const cancelPendingPayment = (paymentId: string) => {
    const payment = pendingPayments.find(p => p.id === paymentId)
    if (!payment) return

    setProducts(prev => 
      prev.map(p => {
        const item = payment.items. find(i => i.product.id === p.id)
        if (item) {
          return { ...p, current_stock: p.current_stock + item. quantity }
        }
        return p
      })
    )

    setPendingPayments(prev => prev.filter(p => p.id !== paymentId))
  }

  const openPaymentDialog = () => {
    if (selectedProducts.size === 0) {
      toast.warning("Selecciona al menos un producto")
      return
    }
    setIsDialogOpen(true)
  }

  const updateBillCount = (denomination: number, count: number) => {
    setBills(bills. map((b) => (b.denomination === denomination ? { ...b, count: Math.max(0, count) } : b)))
  }

  const saveDenominations = async () => {
    setIsLoading(true)
    try {
      const denominationsData = bills.map(bill => ({
        ipv_id: ipv.id,
        user_id: userId,
        denomination: bill.denomination,
        count: bill.count
      }))

      const { error } = await supabase
        .from("denominations")
        .upsert(denominationsData, {
          onConflict: 'ipv_id,user_id,denomination'
        })

      if (error) {
        console.error("Error saving denominations:", error)
        toast.error("Error al guardar las denominaciones")
      } else {
        toast.success("Denominaciones guardadas correctamente")
      }
    } catch (error) {
      console.error("Error saving denominations:", error)
      toast. error("Error al guardar las denominaciones")
    } finally {
      setIsLoading(false)
    }
  }

  const totalCash = sales.filter((s) => s. payment_method === "cash").reduce((sum, s) => sum + Number(s.total_amount), 0)

  const totalTransfer = sales
    .filter((s) => s.payment_method === "transfer")
    .reduce((sum, s) => sum + Number(s.total_amount), 0)

  const totalGeneral = totalCash + totalTransfer

  const totalBills = bills. reduce((sum, b) => sum + b.denomination * b.count, 0)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  const isIPVClosed = ipv.status === 'closed'

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  }

  const handleExportPDF = (comment?: string) => {
    const productStats = products.map((product) => {
      const productSales = sales.filter((s) => s. product_id === product.id)
      const cashSales = productSales.filter((s) => s.payment_method === "cash")
      const transferSales = productSales.filter((s) => s.payment_method === "transfer")

      return {
        name: product.name,
        totalSold: product.initial_stock - product.current_stock,
        cashQuantity: cashSales.reduce((sum, s) => sum + s.quantity, 0),
        cashAmount: cashSales. reduce((sum, s) => sum + Number(s.total_amount), 0),
        transferQuantity: transferSales. reduce((sum, s) => sum + s.quantity, 0),
        transferAmount: transferSales. reduce((sum, s) => sum + Number(s.total_amount), 0),
      }
    })

    const sortedSales = [...sales].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at). getTime()
    )

    const reportData: ReportData = {
      ipvName: ipv.name,
      assignedUserEmail: ipv.user_profile?. email,
      createdByEmail: ipv.created_by_profile?.email,
      totalCash,
      totalTransfer,
      totalGeneral,
      productStats,
      salesHistory: sortedSales. map(sale => {
        const product = products.find(p => p.id === sale.product_id)
        return {
          date: formatDateTime(sale.created_at),
          productName: product?. name || "Producto desconocido",
          quantity: sale.quantity,
          paymentMethod: sale. payment_method,
          total: Number(sale.total_amount)
        }
      }),
      bills,
      comment
    }
    exportReportToPDF(reportData)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Closed IPV Banner */}
      {isIPVClosed && (
        <div className="bg-orange-100 border-b border-orange-300 px-3 py-1.5 sm:px-4 sm:py-2 flex items-center justify-center gap-1.5 sm:gap-2">
          <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600" />
          <span className="text-xs sm:text-sm text-orange-700 font-medium">
            Este IPV está cerrado. Solo puedes ver la información. 
          </span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack} className="text-gray-600 h-8 w-8 sm:h-10 sm:w-10">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">{ipv.name}</h1>
                <Badge variant={isIPVClosed ?  'secondary' : 'default'} className={`text-xs ${isIPVClosed ?  'bg-gray-500' : 'bg-green-500'}`}>
                  {isIPVClosed ? 'Cerrado' : 'Abierto'}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 truncate hidden sm:block">{ipv.description}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-600 h-8 w-8 sm:h-10 sm:w-10 shrink-0">
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="px-3 py-2 sm:p-4 grid grid-cols-3 gap-1.5 sm:gap-2">
        <Card className="bg-green-500 text-white">
          <CardContent className="p-2 sm:p-3 text-center">
            <Banknote className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-0.5 sm:mb-1" />
            <p className="text-[10px] sm:text-xs opacity-90">Efectivo</p>
            <p className="text-sm sm:text-lg font-bold">${formatCurrency(totalCash)}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500 text-white">
          <CardContent className="p-2 sm:p-3 text-center">
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-0.5 sm:mb-1" />
            <p className="text-[10px] sm:text-xs opacity-90">Transfer</p>
            <p className="text-sm sm:text-lg font-bold">${formatCurrency(totalTransfer)}</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-600 text-white">
          <CardContent className="p-2 sm:p-3 text-center">
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-0.5 sm:mb-1" />
            <p className="text-[10px] sm:text-xs opacity-90">Total</p>
            <p className="text-sm sm:text-lg font-bold">${formatCurrency(totalGeneral)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation - Sticky */}
      <div className="bg-gray-50 sticky top-[42px] sm:top-[57px] z-20">
        <div className="px-3 py-2 sm:px-4 sm:py-3">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <Button
            variant={activeTab === "products" ?  "default" : "outline"}
            onClick={() => setActiveTab("products")}
            className="h-8 text-xs sm:h-9 sm:text-sm"
          >
            Productos
          </Button>
          <Button
            variant={activeTab === "pending" ?  "default" : "outline"}
            onClick={() => setActiveTab("pending")}
            className="relative h-8 text-xs sm:h-9 sm:text-sm"
          >
            Pendientes
            {pendingPayments.length > 0 && (
              <Badge className="ml-1 bg-orange-500 text-[10px] sm:text-xs">{pendingPayments.length}</Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            onClick={() => setActiveTab("history")}
            className="h-8 text-xs sm:h-9 sm:text-sm"
          >
            Historial
          </Button>
          <Button
            variant={activeTab === "stats" ? "default" : "outline"}
            onClick={() => setActiveTab("stats")}
            className="col-span-1 h-8 text-xs sm:h-9 sm:text-sm"
          >
            Estadísticas
          </Button>
          <Button
            variant={activeTab === "bills" ?  "default" : "outline"}
            onClick={() => setActiveTab("bills")}
            className="col-span-2 h-8 text-xs sm:h-9 sm:text-sm"
          >
            Billetes
          </Button>
          </div>
        </div>
      </div>

      <div className="px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
        {/* Products Tab */}
        {activeTab === "products" && (() => {
          // Separate products into available and out-of-stock to avoid multiple filtering
          const availableProducts = products.filter(product => product.current_stock > 0)
          const outOfStockProducts = products.filter(product => product.current_stock === 0)

          return (
            <div className="space-y-4">
              {selectedProducts.size > 0 && ! isIPVClosed && (
                <Card className="bg-purple-50 border-purple-200 sticky top-[82px] sm:top-[117px] z-10">
                  <CardContent className="p-2.5 sm:p-4">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        <span className="text-sm sm:text-base font-semibold text-purple-800">
                          {selectedProducts.size} producto(s)
                        </span>
                      </div>
                      <span className="text-lg sm:text-xl font-bold text-purple-700">
                        ${formatCurrency(calculateSelectedTotal())}
                      </span>
                    </div>
                    <Button 
                      onClick={openPaymentDialog}
                      className="w-full bg-purple-600 hover:bg-purple-700 h-9 sm:h-10 text-sm"
                    >
                      Procesar Pago
                    </Button>
                  </CardContent>
                </Card>
              )}

              {products.length === 0 ?  (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    <p>No hay productos en este inventario</p>
                    <p className="text-sm">Contacta al administrador para agregar productos</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Available Products (stock > 0) */}
                  <div className="space-y-2">
                    {availableProducts.map((product) => {
                      const isSelected = selectedProducts.has(product.id)
                      const selectedQty = selectedProducts.get(product.id) || 0
                      
                      return (
                        <Card 
                          key={product.id} 
                          className={`p-4 bg-white transition-shadow ${
                            isSelected ? 'ring-2 ring-purple-500 shadow-md' : 'hover:shadow-md'
                          } ${isIPVClosed ? 'opacity-75' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="pt-1">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleProductSelection(product.id)}
                                disabled={isIPVClosed}
                                className="h-5 w-5"
                              />
                            </div>
                            
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
                                  <span className={`font-semibold ${Math.max(0, product.current_stock - selectedQty) > 5 ? "text-blue-600" : "text-red-600"}`}>
                                    {Math.max(0, product.current_stock - selectedQty)}
                                  </span>
                                </span>
                              </div>
                            </div>
                            
                            {isSelected && !isIPVClosed && (
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

                  {/* Out of Stock Products (stock = 0) - Collapsible Section */}
                  {outOfStockProducts.length > 0 && (
                    <Collapsible open={isOutOfStockOpen} onOpenChange={setIsOutOfStockOpen} className="mt-4">
                      <Card className="bg-gray-100 border-gray-300">
                        <CollapsibleTrigger asChild>
                          <button className="w-full">
                            <CardHeader className="cursor-pointer hover:bg-gray-200 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Package className="h-5 w-5 text-gray-600" />
                                  <CardTitle className="text-base text-gray-700">
                                    Productos agotados ({outOfStockProducts.length})
                                  </CardTitle>
                                </div>
                                {isOutOfStockOpen ? (
                                  <ChevronUp className="h-5 w-5 text-gray-600" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-gray-600" />
                                )}
                              </div>
                            </CardHeader>
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0 space-y-2">
                            {outOfStockProducts.map((product) => (
                              <Card 
                                key={product.id} 
                                className="p-4 bg-white opacity-60"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="pt-1">
                                    <Checkbox
                                      checked={false}
                                      disabled={true}
                                      className="h-5 w-5"
                                    />
                                  </div>
                                  
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
                                        <span className="font-semibold text-red-600">
                                          0 (Agotado)
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            ))}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                    </Collapsible>
                  )}
                </>
              )}
            </div>
          )
        })()}

        {/* Pending Payments Tab */}
        {activeTab === "pending" && (
          <div className="space-y-4">
            {pendingPayments. length === 0 ? (
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
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {payment.status === "confirmed" ?  (
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
                          ${formatCurrency(payment. total)}
                        </span>
                      </div>

                      <div className="space-y-1 mb-3">
                        {payment.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.product.name} x{item.quantity}</span>
                            <span className="font-medium">${formatCurrency(item. product.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>

                      {payment.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => cancelPendingPayment(payment.id)}
                            className="flex-1"
                            disabled={confirmingPaymentId !== null || isIPVClosed}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Cancelar
                          </Button>
                          <Button
                            onClick={() => confirmPayment(payment.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            disabled={confirmingPaymentId !== null || isIPVClosed}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            {confirmingPaymentId === payment.id ? "Procesando..." : "Confirmar"}
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
            <div className="flex justify-end">
              <Button onClick={() => setIsPDFModalOpen(true)} className="shrink-0 h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
                <FileDown className="h-4 w-4" />
                <span className="ml-1">Exportar PDF</span>
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Estadísticas Generales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <Banknote className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="text-sm text-green-700 font-medium">Total Efectivo</p>
                    <p className="text-2xl font-bold text-green-800">${formatCurrency(totalCash)}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {sales.filter((s) => s. payment_method === "cash").reduce((sum, s) => sum + s.quantity, 0)} unidades
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-blue-700 font-medium">Total Transferencia</p>
                    <p className="text-2xl font-bold text-blue-800">${formatCurrency(totalTransfer)}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      {sales.filter((s) => s. payment_method === "transfer").reduce((sum, s) => sum + s.quantity, 0)} unidades
                    </p>
                  </div>
                </div>

                <div className="bg-purple-100 rounded-lg p-4 text-center">
                  <DollarSign className="h-10 w-10 mx-auto mb-2 text-purple-600" />
                  <p className="text-lg text-purple-700 font-medium">Total General</p>
                  <p className="text-3xl font-bold text-purple-800">${formatCurrency(totalGeneral)}</p>
                  <p className="text-sm text-purple-600 mt-1">
                    {sales.reduce((sum, s) => sum + s. quantity, 0)} unidades vendidas
                  </p>
                </div>
              </CardContent>
            </Card>

            {products.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detalle por Producto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {products.map((product) => {
                      const productSales = sales. filter((s) => s.product_id === product.id)
                      const cashSales = productSales.filter((s) => s.payment_method === "cash")
                      const transferSales = productSales.filter((s) => s. payment_method === "transfer")
                      const cashQuantity = cashSales.reduce((sum, s) => sum + s.quantity, 0)
                      const transferQuantity = transferSales. reduce((sum, s) => sum + s.quantity, 0)
                      const cashAmount = cashSales.reduce((sum, s) => sum + Number(s.total_amount), 0)
                      const transferAmount = transferSales.reduce((sum, s) => sum + Number(s.total_amount), 0)

                      return (
                        <div key={product. id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold">{product.name}</h4>
                            <span className="text-sm text-gray-500">${formatCurrency(product.price)}/u</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center text-sm">
                            <div className="bg-green-50 rounded p-2">
                              <p className="text-green-600 font-medium">{cashQuantity}</p>
                              <p className="text-xs text-green-700">${formatCurrency(cashAmount)}</p>
                              <p className="text-xs text-gray-500">Efectivo</p>
                            </div>
                            <div className="bg-blue-50 rounded p-2">
                              <p className="text-blue-600 font-medium">{transferQuantity}</p>
                              <p className="text-xs text-blue-700">${formatCurrency(transferAmount)}</p>
                              <p className="text-xs text-gray-500">Transfer</p>
                            </div>
                            <div className="bg-purple-50 rounded p-2">
                              <p className="text-purple-600 font-medium">{cashQuantity + transferQuantity}</p>
                              <p className="text-xs text-purple-700">${formatCurrency(cashAmount + transferAmount)}</p>
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
                    <div key={bill.denomination} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="w-14 flex-shrink-0 text-center">
                        <span className="font-bold text-gray-700 text-sm">${bill.denomination}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateBillCount(bill.denomination, bill.count - 1)}
                          disabled={isIPVClosed}
                          className="h-8 w-8"
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          value={bill.count === 0 ? "" : bill.count}
                          onChange={(e) => updateBillCount(bill. denomination, Number. parseInt(e.target. value) || 0)}
                          onBlur={(e) => {
                            if (e.target.value === "") {
                              updateBillCount(bill.denomination, 0)
                            }
                          }}
                          disabled={isIPVClosed}
                          className="w-16 text-center"
                          min="0"
                          placeholder="0"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateBillCount(bill.denomination, bill.count + 1)}
                          disabled={isIPVClosed}
                          className="h-8 w-8"
                        >
                          +
                        </Button>
                      </div>
                      <div className="flex-1 text-right min-w-0">
                        <span className="font-medium text-green-600 text-sm truncate block">
                          ${(bill.denomination * bill.count). toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={saveDenominations}
              disabled={isLoading || isIPVClosed}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Guardando..." : "Guardar Denominaciones"}
            </Button>

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
                {sales.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    <Clock className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                    <p>No hay ventas registradas</p>
                    <p className="text-sm">Las ventas confirmadas aparecerán aquí</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...sales]
                      .sort((a, b) => new Date(b.created_at). getTime() - new Date(a.created_at).getTime())
                      . map((sale) => {
                        const product = products.find(p => p.id === sale.product_id)
                        const saleDate = new Date(sale.created_at)
                        return (
                          <div key={sale.id} className="border rounded-lg p-3 hover:bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{product?. name || "Producto"}</span>
                              <Badge 
                                className={sale.payment_method === "cash" ? "bg-green-500" : "bg-blue-500"}
                              >
                                {sale.payment_method === "cash" ? (
                                  <><Banknote className="h-3 w-3 mr-1" />Efectivo</>
                                ) : (
                                  <><CreditCard className="h-3 w-3 mr-1" />Transfer</>
                                )}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                {saleDate.toLocaleDateString("es-MX", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric"
                                })} {saleDate.toLocaleTimeString("es-MX", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true
                                })}
                              </span>
                              <span className="font-bold">
                                {sale.quantity} × ${formatCurrency(Number(sale.unit_price))} = ${formatCurrency(Number(sale. total_amount))}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
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

      {/* PDF Export Modal */}
      <PDFExportModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        onExport={handleExportPDF}
      />
    </div>
  )
}
