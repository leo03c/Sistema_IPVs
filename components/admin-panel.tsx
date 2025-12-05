"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Package, LogOut, ArrowLeft, Trash2, BarChart3, Edit2, Lock, LockOpen, Banknote, FileDown, Save, ShoppingBag } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import { exportReportToPDF, type BillCount, type ReportData } from "@/lib/pdf-export"
import { toast } from "sonner"
import type { CatalogProduct } from "@/lib/types"
import { PDFExportModal } from "@/components/pdf-export-modal"
import { usePreventLoginBack } from "@/lib/hooks/use-prevent-login-back"

type Profile = {
  id: string
  email: string
  role: string
}

type IPV = {
  id: string
  name: string
  user_id: string
  created_by?: string
  status?: 'open' | 'closed'
  user_profile?: { email: string }
  created_by_profile?: { email: string }
}

type Product = {
  id: string
  name: string
  price: number
  initial_stock: number
  current_stock: number
  ipv_id: string
  catalog_product_id?: string
}

type Sale = {
  id: string
  product_id: string
  quantity: number
  payment_method: string
  total_amount: number
  created_at: string
  products?: { name: string }
}

type AdminPanelProps = {
  profile: Profile
  initialIpvs: IPV[]
  initialUsers: Profile[]
  initialProducts: Product[]
  initialSales: Sale[]
  initialCatalogProducts: CatalogProduct[]
}

export function AdminPanel({ profile, initialIpvs, initialUsers, initialProducts, initialSales, initialCatalogProducts }: AdminPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  // Prevent navigating back to login page
  usePreventLoginBack()

  const [ipvs, setIpvs] = useState<IPV[]>(initialIpvs)
  const users = initialUsers // Read-only, no state needed
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const sales = initialSales // Read-only, no state needed
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>(initialCatalogProducts)
  const [isIPVDialogOpen, setIsIPVDialogOpen] = useState(false)
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [isCatalogProductDialogOpen, setIsCatalogProductDialogOpen] = useState(false)
  const [isEditProductDialogOpen, setIsEditProductDialogOpen] = useState(false)
  const [isEditCatalogProductDialogOpen, setIsEditCatalogProductDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingCatalogProduct, setEditingCatalogProduct] = useState<CatalogProduct | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [isCreatingIPV, setIsCreatingIPV] = useState(false)
  const [isCreatingProduct, setIsCreatingProduct] = useState(false)
  const [isCreatingCatalogProduct, setIsCreatingCatalogProduct] = useState(false)
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false)
  const [isUpdatingCatalogProduct, setIsUpdatingCatalogProduct] = useState(false)
  const [isDeletingIPV, setIsDeletingIPV] = useState<string | null>(null)
  const [isDeletingProduct, setIsDeletingProduct] = useState<string | null>(null)
  const [isDeletingCatalogProduct, setIsDeletingCatalogProduct] = useState<string | null>(null)
  const [isTogglingStatus, setIsTogglingStatus] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  
  // Sticky tabs state and refs
  const [isIPVTabsSticky, setIsIPVTabsSticky] = useState(false)
  const [isMainTabsSticky, setIsMainTabsSticky] = useState(false)
  const ipvTabsRef = useRef<HTMLDivElement>(null)
  const mainTabsRef = useRef<HTMLDivElement>(null)
  const ipvTabsOffsetRef = useRef<number>(0)
  const mainTabsOffsetRef = useRef<number>(0)
  const ipvTabsHeightRef = useRef<number>(0)
  const mainTabsHeightRef = useRef<number>(0)

  // Get initial states from URL or default values
  const initialMainView = (searchParams.get("view") as "ipvs" | "catalog") || "ipvs"
  const initialActiveTab = (searchParams.get("tab") as "products" | "reports") || "products"
  const initialSelectedIPVId = searchParams.get("ipv")

  const [mainView, setMainView] = useState<"ipvs" | "catalog">(initialMainView)
  const [activeTab, setActiveTab] = useState<"products" | "reports">(initialActiveTab)
  const [selectedIPV, setSelectedIPV] = useState<IPV | null>(() => {
    if (initialSelectedIPVId) {
      return initialIpvs.find(ipv => ipv.id === initialSelectedIPVId) || null
    }
    return null
  })

  // Set client flag on mount
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Scroll listener for sticky tabs
  useEffect(() => {
    // Store initial offsets - only when not sticky
    const storeOffsets = () => {
      if (ipvTabsRef.current && ipvTabsOffsetRef.current === 0) {
        ipvTabsOffsetRef.current = ipvTabsRef.current.offsetTop
        ipvTabsHeightRef.current = ipvTabsRef.current.offsetHeight
      }
      if (mainTabsRef.current && mainTabsOffsetRef.current === 0) {
        mainTabsOffsetRef.current = mainTabsRef.current.offsetTop
        mainTabsHeightRef.current = mainTabsRef.current.offsetHeight
      }
    }
    
    const handleScroll = () => {
      // Check IPV detail tabs
      if (ipvTabsRef.current && ipvTabsOffsetRef.current > 0) {
        const shouldBeSticky = window.scrollY >= ipvTabsOffsetRef.current
        setIsIPVTabsSticky(shouldBeSticky)
      }
      
      // Check main dashboard tabs
      if (mainTabsRef.current && mainTabsOffsetRef.current > 0) {
        const shouldBeSticky = window.scrollY >= mainTabsOffsetRef.current
        setIsMainTabsSticky(shouldBeSticky)
      }
    }

    // Store offsets on mount and when view changes
    storeOffsets()
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', storeOffsets, { passive: true })
    
    // Initial check
    handleScroll()
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', storeOffsets)
    }
  }, [selectedIPV, mainView])

  // Sync all state changes to URL
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams.toString())
    if (selectedIPV) {
      newParams.set("ipv", selectedIPV.id)
      newParams.set("tab", activeTab)
      newParams.delete("view")
    } else {
      newParams.delete("ipv")
      newParams.delete("tab")
      newParams.set("view", mainView)
    }
    router.replace(`?${newParams.toString()}`, { scroll: false })
  }, [selectedIPV, mainView, activeTab, router, searchParams])

  const createIPV = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    if (!selectedUserId) {
      alert("Por favor selecciona un usuario")
      return
    }

    const { data, error } = await supabase.from("ipvs").insert({
      name: formData.get("name") as string,
      user_id: selectedUserId,
      created_by: profile.id,
    }).select("*, user_profile:profiles!user_id(email), created_by_profile:profiles!created_by(email)")

    if (!error && data) {
      setIpvs([data[0], ...ipvs])
      setIsIPVDialogOpen(false)
      setSelectedUserId("")
      ;(e.target as HTMLFormElement).reset()
    } else {
      console.error("Error creating IPV:", error)
      alert("Error al crear el IPV: " + error?.message)
    }
  }

  const deleteIPV = async (ipvId: string) => {
    setIsDeletingIPV(ipvId)
    try {
      const { error } = await supabase.from("ipvs").delete().eq("id", ipvId)

      if (!error) {
        setIpvs(ipvs.filter((ipv) => ipv.id !== ipvId))
        // Products are cascade deleted in database (ON DELETE CASCADE in foreign key)
        // Update local state to reflect this
        setProducts(products.filter((p) => p.ipv_id !== ipvId))
      } else {
        console.error("Error deleting IPV:", error)
        alert("Error al eliminar el IPV: " + error.message)
      }
    } finally {
      setIsDeletingIPV(null)
    }
  }

  // Catalog Product CRUD operations
  const createCatalogProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    setIsCreatingCatalogProduct(true)
    try {
      const { data, error } = await supabase.from("product_catalog").insert({
        admin_id: profile.id,
        name: formData.get("name") as string,
        price: Number.parseFloat(formData.get("price") as string),
        description: formData.get("description") as string || null,
      }).select()

      if (!error && data) {
        setCatalogProducts([...catalogProducts, data[0]])
        setIsCatalogProductDialogOpen(false)
        ;(e.target as HTMLFormElement).reset()
        toast.success("Producto agregado al catálogo")
      } else {
        console.error("Error creating catalog product:", error)
        toast.error("Error al crear el producto: " + error?.message)
      }
    } finally {
      setIsCreatingCatalogProduct(false)
    }
  }

  const updateCatalogProduct = async (productId: string, updates: { name?: string; price?: number; description?: string }): Promise<boolean> => {
    setIsUpdatingCatalogProduct(true)
    try {
      const { error } = await supabase.from("product_catalog").update(updates).eq("id", productId)

      if (!error) {
        setCatalogProducts(catalogProducts.map((p) => p.id === productId ? { ...p, ...updates } : p))
        toast.success("Producto actualizado")
        return true
      } else {
        console.error("Error updating catalog product:", error)
        toast.error("Error al actualizar el producto: " + error.message)
        return false
      }
    } finally {
      setIsUpdatingCatalogProduct(false)
    }
  }

  const deleteCatalogProduct = async (productId: string) => {
    setIsDeletingCatalogProduct(productId)
    try {
      const { error } = await supabase.from("product_catalog").delete().eq("id", productId)

      if (!error) {
        setCatalogProducts(catalogProducts.filter((p) => p.id !== productId))
        toast.success("Producto eliminado del catálogo")
      } else {
        console.error("Error deleting catalog product:", error)
        toast.error("Error al eliminar el producto: " + error.message)
      }
    } finally {
      setIsDeletingCatalogProduct(null)
    }
  }

  // Add product from catalog to IPV
  const addCatalogProductToIPV = async (catalogProductId: string, quantity: number): Promise<boolean> => {
    if (!selectedIPV) {
      toast.error("Por favor selecciona un IPV")
      return false
    }

    // Validate quantity
    if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
      toast.error("La cantidad debe ser un número entero positivo")
      return false
    }

    setIsCreatingProduct(true)
    try {
      const catalogProduct = catalogProducts.find(p => p.id === catalogProductId)
      if (!catalogProduct) {
        toast.error("Producto no encontrado en el catálogo")
        return false
      }

      const { data, error } = await supabase.from("products").insert({
        ipv_id: selectedIPV.id,
        catalog_product_id: catalogProductId,
        name: catalogProduct.name,
        price: catalogProduct.price,
        initial_stock: quantity,
        current_stock: quantity,
      }).select()

      if (!error && data) {
        setProducts([...products, data[0]])
        toast.success("Producto agregado al IPV")
        return true
      } else {
        console.error("Error adding product to IPV:", error)
        toast.error("Error al agregar el producto al IPV: " + error?.message)
        return false
      }
    } finally {
      setIsCreatingProduct(false)
    }
  }

  const createProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    if (!selectedIPV) {
      alert("Por favor selecciona un IPV")
      return
    }

    const initialStock = Number.parseInt(formData.get("initial_stock") as string)

    setIsCreatingProduct(true)
    try {
      const { data, error } = await supabase.from("products").insert({
        ipv_id: selectedIPV.id,
        name: formData.get("name") as string,
        price: Number.parseFloat(formData.get("price") as string),
        initial_stock: initialStock,
        current_stock: initialStock,
      }).select()

      if (!error && data) {
        setProducts([...products, data[0]])
        setIsProductDialogOpen(false)
        ;(e.target as HTMLFormElement).reset()
      } else {
        console.error("Error creating product:", error)
        alert("Error al crear el producto: " + error?.message)
      }
    } finally {
      setIsCreatingProduct(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  // Toggle IPV status between open and closed
  const toggleIPVStatus = async (ipvId: string, currentStatus: 'open' | 'closed') => {
    setIsTogglingStatus(ipvId)
    try {
      const newStatus = currentStatus === 'open' ? 'closed' : 'open'
      const { error } = await supabase.from("ipvs").update({ status: newStatus }).eq("id", ipvId)

      if (!error) {
        setIpvs(ipvs.map((ipv) => ipv.id === ipvId ? { ...ipv, status: newStatus } : ipv))
        if (selectedIPV && selectedIPV.id === ipvId) {
          setSelectedIPV({ ...selectedIPV, status: newStatus })
        }
      } else {
        console.error("Error toggling IPV status:", error)
        alert("Error al cambiar el estado del IPV: " + error.message)
      }
    } finally {
      setIsTogglingStatus(null)
    }
  }

  // Delete a product
  const deleteProduct = async (productId: string) => {
    setIsDeletingProduct(productId)
    try {
      const { error } = await supabase.from("products").delete().eq("id", productId)

      if (!error) {
        setProducts(products.filter((p) => p.id !== productId))
      } else {
        console.error("Error deleting product:", error)
        alert("Error al eliminar el producto: " + error.message)
      }
    } finally {
      setIsDeletingProduct(null)
    }
  }

  // Update a product
  const updateProduct = async (productId: string, updates: { name?: string; price?: number; initial_stock?: number; current_stock?: number }): Promise<boolean> => {
    setIsUpdatingProduct(true)
    try {
      const { error } = await supabase.from("products").update(updates).eq("id", productId)

      if (!error) {
        setProducts(products.map((p) => p.id === productId ? { ...p, ...updates } : p))
        return true
      } else {
        console.error("Error updating product:", error)
        alert("Error al actualizar el producto: " + error.message)
        return false
      }
    } finally {
      setIsUpdatingProduct(false)
    }
  }

  // Get products for selected IPV
  const ipvProducts = selectedIPV ? products.filter((p) => p.ipv_id === selectedIPV.id) : []
  // Get sales for selected IPV
  const ipvSales = selectedIPV ? sales.filter((s) => {
    const productIds = ipvProducts.map((p) => p.id)
    return productIds.includes(s.product_id)
  }) : []

  // Get available catalog products (not already in the selected IPV)
  const availableCatalogProducts = useMemo(() => {
    if (!selectedIPV) return catalogProducts

    const catalogProductIdsInIPV = new Set(
      ipvProducts
        .filter((p): p is Product & { catalog_product_id: string } => p.catalog_product_id != null)
        .map(p => p.catalog_product_id)
    )
    
    return catalogProducts.filter(cp => !catalogProductIdsInIPV.has(cp.id))
  }, [selectedIPV, ipvProducts, catalogProducts])

  // If an IPV is selected, show the IPV detail view
  if (selectedIPV) {
    return (
      <div className="min-h-screen bg-gray-50 overflow-x-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 md:py-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Button variant="ghost" size="icon" onClick={() => setSelectedIPV(null)} className="shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-900 truncate">{selectedIPV.name}</h1>
                  <Badge variant={selectedIPV.status === 'open' ? 'default' : 'secondary'} className={selectedIPV.status === 'open' ? 'bg-green-500' : 'bg-gray-500'}>
                    {selectedIPV.status === 'open' ? 'Abierto' : 'Cerrado'}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  Asignado a: {selectedIPV.user_profile?.email || "Sin asignar"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                disabled={isTogglingStatus === selectedIPV.id}
                onClick={() => toggleIPVStatus(selectedIPV.id, selectedIPV.status || 'open')}
                className={`shrink-0 h-8 sm:h-9 px-2 sm:px-3 ${selectedIPV.status === 'open' ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
              >
                {selectedIPV.status === 'open' ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                <span className="hidden sm:inline sm:ml-2">{isTogglingStatus === selectedIPV.id ? '...' : selectedIPV.status === 'open' ? 'Cerrar' : 'Abrir'}</span>
              </Button>
              <Button variant="outline" onClick={handleLogout} size="sm" className="shrink-0 h-8 sm:h-9 px-2 sm:px-3">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline sm:ml-2">Salir</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div 
          ref={ipvTabsRef}
          className={`bg-gray-50 transition-all duration-200 ${
            isIPVTabsSticky 
              ? 'fixed top-0 left-0 right-0 z-40 shadow-md' 
              : 'relative'
          }`}
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 md:py-4">
            <div className="flex gap-1.5 sm:gap-2">
              <Button
                variant={activeTab === "products" ? "default" : "outline"}
                onClick={() => setActiveTab("products")}
                className="flex-1 text-xs sm:text-sm h-8 sm:h-9 md:h-10"
              >
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Productos</span>
                <span className="sm:hidden ml-1">Prod.</span>
              </Button>
              <Button
                variant={activeTab === "reports" ? "default" : "outline"}
                onClick={() => setActiveTab("reports")}
                className="flex-1 text-xs sm:text-sm h-8 sm:h-9 md:h-10"
              >
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Reportes</span>
                <span className="sm:hidden ml-1">Rep.</span>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Spacer when sticky */}
        {isIPVTabsSticky && <div style={{ height: `${ipvTabsHeightRef.current}px` }} />}

        <div className="max-w-7xl mx-auto p-2 sm:p-3 md:p-4">
          {/* Products Tab */}
          {activeTab === "products" && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold">Productos del IPV</h2>
                <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="shrink-0 h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
                      <Plus className="h-4 w-4" />
                      <span className="ml-1">Agregar desde Catálogo</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-base sm:text-lg">Agregar Producto a {selectedIPV.name}</DialogTitle>
                    </DialogHeader>
                    {catalogProducts.length === 0 ? (
                      <div className="text-center py-8">
                        <ShoppingBag className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-600 mb-2">No tienes productos en tu catálogo</p>
                        <p className="text-sm text-gray-500 mb-4">Crea productos en la pestaña &quot;Catálogo de Productos&quot; primero</p>
                        <Button variant="outline" onClick={() => {
                          setIsProductDialogOpen(false)
                          setMainView("catalog")
                        }}>
                          Ir a Catálogo
                        </Button>
                      </div>
                    ) : availableCatalogProducts.length === 0 ? (
                      <div className="text-center py-8">
                        <ShoppingBag className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-600 mb-2">Todos los productos del catálogo ya están en este IPV</p>
                        <p className="text-sm text-gray-500 mb-4">No puedes agregar un producto repetido al mismo IPV</p>
                        <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>
                          Cerrar
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={async (e) => {
                        e.preventDefault()
                        const formData = new FormData(e.currentTarget)
                        const catalogProductId = formData.get("catalog_product_id") as string
                        const quantityStr = formData.get("quantity") as string
                        
                        if (!catalogProductId) {
                          toast.error("Por favor selecciona un producto")
                          return
                        }
                        
                        const quantity = Number.parseInt(quantityStr, 10)
                        if (isNaN(quantity) || quantity <= 0) {
                          toast.error("Por favor ingresa una cantidad válida")
                          return
                        }
                        
                        const success = await addCatalogProductToIPV(catalogProductId, quantity)
                        if (success) {
                          setIsProductDialogOpen(false)
                          ;(e.target as HTMLFormElement).reset()
                        }
                      }} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="catalog_product_id">Producto del Catálogo</Label>
                          <Select name="catalog_product_id" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un producto" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableCatalogProducts.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} - ${formatCurrency(product.price)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quantity">Cantidad a Enviar</Label>
                          <Input
                            id="quantity"
                            name="quantity"
                            type="number"
                            min="1"
                            step="1"
                            required
                            placeholder="¿Cuántos productos envías?"
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={isCreatingProduct}>
                          {isCreatingProduct ? "Agregando..." : "Agregar al IPV"}
                        </Button>
                      </form>
                    )}
                  </DialogContent>
                </Dialog>
              </div>

              {ipvProducts.length === 0 ? (
                <Card className="p-4 sm:p-6 text-center">
                  <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-3 sm:mb-4" />
                  <p className="text-gray-600 mb-2 text-sm sm:text-base">No hay productos en este IPV</p>
                  <p className="text-xs sm:text-sm text-blue-600">
                    Agrega productos usando el botón "Agregar".
                  </p>
                </Card>
              ) : (
                <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {ipvProducts.map((product) => (
                    <Card key={product.id}>
                      <CardHeader className="p-3 sm:p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                        <CardTitle className="text-sm sm:text-base md:text-lg truncate flex-1 pr-2">{product.name}</CardTitle>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              setEditingProduct(product)
                              setIsEditProductDialogOpen(true)
                            }}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar Producto?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción eliminará permanentemente el producto &quot;{product.name}&quot; y todas sus ventas asociadas.
                                  Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                <AlertDialogCancel className="mt-0">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={isDeletingProduct === product.id}
                                  onClick={() => deleteProduct(product.id)}
                                >
                                  {isDeletingProduct === product.id ? "Eliminando..." : "Eliminar"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 p-3 sm:p-4 pt-0">
                        <p className="text-2xl font-bold text-blue-600">${formatCurrency(product.price)}</p>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Stock Inicial: {product.initial_stock}</span>
                          <Badge variant={product.current_stock > 5 ? "default" : "destructive"}>
                            Quedan: {product.current_stock}
                          </Badge>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">
                          Vendidos: <span className="font-semibold text-green-600">
                            {product.initial_stock - product.current_stock}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Edit Product Dialog */}
              <Dialog open={isEditProductDialogOpen} onOpenChange={(open) => {
                setIsEditProductDialogOpen(open)
                if (!open) setEditingProduct(null)
              }}>
                <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-base sm:text-lg">Editar Producto</DialogTitle>
                  </DialogHeader>
                  {editingProduct && (
                    <form onSubmit={async (e) => {
                      e.preventDefault()
                      const formData = new FormData(e.currentTarget)
                      const name = formData.get("name")
                      const price = formData.get("price")
                      const initialStock = formData.get("initial_stock")
                      const currentStock = formData.get("current_stock")
                      
                      if (!name || !price || !initialStock || !currentStock) {
                        alert("Por favor completa todos los campos")
                        return
                      }
                      
                      const success = await updateProduct(editingProduct.id, {
                        name: name as string,
                        price: Number.parseFloat(price as string),
                        initial_stock: Number.parseInt(initialStock as string),
                        current_stock: Number.parseInt(currentStock as string),
                      })
                      
                      if (success) {
                        setIsEditProductDialogOpen(false)
                        setEditingProduct(null)
                      }
                    }} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_product_name">Nombre del Producto</Label>
                        <Input id="edit_product_name" name="name" defaultValue={editingProduct.name} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_price">Precio</Label>
                        <Input id="edit_price" name="price" type="number" step="0.01" min="0" defaultValue={editingProduct.price} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_initial_stock">Stock Inicial</Label>
                        <Input id="edit_initial_stock" name="initial_stock" type="number" min="0" defaultValue={editingProduct.initial_stock} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_current_stock">Stock Actual</Label>
                        <Input id="edit_current_stock" name="current_stock" type="number" min="0" defaultValue={editingProduct.current_stock} required />
                      </div>
                      <Button type="submit" className="w-full" disabled={isUpdatingProduct}>
                        {isUpdatingProduct ? "Guardando..." : "Guardar Cambios"}
                      </Button>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === "reports" && (
            <IPVReportsSection 
              sales={ipvSales} 
              products={ipvProducts} 
              ipv={selectedIPV}
            />
          )}
        </div>
      </div>
    )
  }

  // Main dashboard view - list of IPVs and Catalog
  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 md:py-4 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-900 truncate">Panel de Administración</h1>
            <p className="text-xs sm:text-sm text-gray-500 truncate">{profile.email}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} size="sm" className="shrink-0 h-8 sm:h-9 px-2 sm:px-3">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline sm:ml-2">Salir</span>
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-2 sm:p-3 md:p-4">
        <Tabs value={mainView} onValueChange={(v) => setMainView(v as "ipvs" | "catalog")} className="space-y-3 sm:space-y-4">
          <div 
            ref={mainTabsRef}
            className={`transition-all duration-200 ${
              isMainTabsSticky 
                ? 'fixed top-0 left-0 right-0 z-40 bg-gray-50 shadow-md py-2 sm:py-3 md:py-4' 
                : 'relative'
            }`}
          >
            <div className={isMainTabsSticky ? "max-w-7xl mx-auto px-3 sm:px-4" : ""}>
              <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
                <TabsTrigger value="ipvs" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span>Mis IPVs</span>
                </TabsTrigger>
                <TabsTrigger value="catalog" className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  <span>Catálogo de Productos</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
          
          {/* Spacer when sticky */}
          {isMainTabsSticky && <div style={{ height: `${mainTabsHeightRef.current}px` }} />}

          {/* IPVs Tab Content */}
          <TabsContent value="ipvs" className="space-y-3 sm:space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold">Mis Inventarios (IPVs)</h2>
          <Dialog open={isIPVDialogOpen} onOpenChange={(open) => {
            setIsIPVDialogOpen(open)
            if (!open) setSelectedUserId("")
          }}>
            <DialogTrigger asChild>
              <Button className="shrink-0 h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
                <Plus className="h-4 w-4" />
                <span className="ml-1">Nuevo</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Crear Nuevo IPV</DialogTitle>
              </DialogHeader>
              <form onSubmit={createIPV} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user_id">Asignar a Usuario</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={isCreatingIPV}>
                  {isCreatingIPV ? "Creando..." : "Crear IPV"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {ipvs.length === 0 ? (
          <Card className="p-4 sm:p-6 text-center">
            <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-3 sm:mb-4" />
            <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">No se encontraron IPVs.</p>
            <p className="text-xs sm:text-sm text-blue-600">
              Crea un nuevo IPV usando el botón "Nuevo" para comenzar.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {ipvs.map((ipv) => {
              const ipvProductCount = products.filter((p) => p.ipv_id === ipv.id).length
              const ipvTotalStock = products
                .filter((p) => p.ipv_id === ipv.id)
                .reduce((sum, p) => sum + p.current_stock, 0)

              return (
                <Card 
                  key={ipv.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedIPV(ipv)}
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 p-3 sm:p-4 pb-2">
                    <div className="min-w-0 flex-1 pr-2">
                      <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                        <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
                        <span className="truncate">{ipv.name}</span>
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isTogglingStatus === ipv.id}
                        className={`h-7 w-7 sm:h-8 sm:w-8 shrink-0 ${ipv.status === 'open' ? 'text-orange-500 hover:text-orange-700 hover:bg-orange-50' : 'text-green-500 hover:text-green-700 hover:bg-green-50'}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleIPVStatus(ipv.id, ipv.status || 'open')
                        }}
                        title={ipv.status === 'open' ? 'Cerrar IPV' : 'Abrir IPV'}
                      >
                        {ipv.status === 'open' ? <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <LockOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 sm:h-8 sm:w-8 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()} className="max-w-[calc(100vw-2rem)] sm:max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar IPV?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará permanentemente el IPV &quot;{ipv.name}&quot; y todos sus productos asociados.
                            Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                          <AlertDialogCancel className="mt-0">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isDeletingIPV === ipv.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteIPV(ipv.id)
                            }}
                          >
                            {isDeletingIPV === ipv.id ? "Eliminando..." : "Eliminar"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-4 pt-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="truncate text-xs flex-1">{ipv.user_profile?.email || "Sin asignar"}</Badge>
                      <Badge variant={ipv.status === 'open' ? 'default' : 'secondary'} className={`text-xs shrink-0 ${ipv.status === 'open' ? 'bg-green-500' : 'bg-gray-500'}`}>
                        {ipv.status === 'open' ? 'Abierto' : 'Cerrado'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                      <span>Productos: <span className="font-semibold">{ipvProductCount}</span></span>
                      <span>Stock: <span className="font-semibold">{ipvTotalStock}</span></span>
                    </div>
                    <Button className="w-full h-8 sm:h-9 text-xs sm:text-sm" variant="outline">
                      Ver Detalles
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
          </TabsContent>

          {/* Catalog Tab Content */}
          <TabsContent value="catalog" className="space-y-3 sm:space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold">Catálogo de Productos</h2>
              <Dialog open={isCatalogProductDialogOpen} onOpenChange={setIsCatalogProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="shrink-0 h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
                    <Plus className="h-4 w-4" />
                    <span className="ml-1">Nuevo Producto</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Crear Producto en Catálogo</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={createCatalogProduct} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="catalog_product_name">Nombre del Producto</Label>
                      <Input id="catalog_product_name" name="name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="catalog_product_price">Precio</Label>
                      <Input id="catalog_product_price" name="price" type="number" step="0.01" min="0.01" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="catalog_product_description">Descripción (Opcional)</Label>
                      <Input id="catalog_product_description" name="description" />
                    </div>
                    <Button type="submit" className="w-full" disabled={isCreatingCatalogProduct}>
                      {isCreatingCatalogProduct ? "Creando..." : "Crear Producto"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {catalogProducts.length === 0 ? (
              <Card className="p-4 sm:p-6 text-center">
                <ShoppingBag className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-3 sm:mb-4" />
                <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">No tienes productos en tu catálogo.</p>
                <p className="text-xs sm:text-sm text-blue-600">
                  Crea productos aquí y luego podrás agregarlos a tus IPVs especificando la cantidad.
                </p>
              </Card>
            ) : (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {catalogProducts.map((product) => (
                  <Card key={product.id}>
                    <CardHeader className="p-3 sm:p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                      <CardTitle className="text-sm sm:text-base md:text-lg truncate flex-1 pr-2">{product.name}</CardTitle>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            setEditingCatalogProduct(product)
                            setIsEditCatalogProductDialogOpen(true)
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar Producto del Catálogo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará permanentemente &quot;{product.name}&quot; de tu catálogo.
                                Los productos ya agregados a IPVs no se verán afectados.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                              <AlertDialogCancel className="mt-0">Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                disabled={isDeletingCatalogProduct === product.id}
                                onClick={() => deleteCatalogProduct(product.id)}
                              >
                                {isDeletingCatalogProduct === product.id ? "Eliminando..." : "Eliminar"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 p-3 sm:p-4 pt-0">
                      <p className="text-2xl font-bold text-blue-600">${formatCurrency(product.price)}</p>
                      {product.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Edit Catalog Product Dialog */}
            <Dialog open={isEditCatalogProductDialogOpen} onOpenChange={(open) => {
              setIsEditCatalogProductDialogOpen(open)
              if (!open) setEditingCatalogProduct(null)
            }}>
              <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base sm:text-lg">Editar Producto del Catálogo</DialogTitle>
                </DialogHeader>
                {editingCatalogProduct && (
                  <form onSubmit={async (e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    const name = formData.get("name")
                    const price = formData.get("price")
                    const description = formData.get("description")
                    
                    if (!name || !price) {
                      toast.error("Por favor completa todos los campos requeridos")
                      return
                    }
                    
                    const success = await updateCatalogProduct(editingCatalogProduct.id, {
                      name: name as string,
                      price: Number.parseFloat(price as string),
                      description: description as string || undefined,
                    })
                    
                    if (success) {
                      setIsEditCatalogProductDialogOpen(false)
                      setEditingCatalogProduct(null)
                    }
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_catalog_product_name">Nombre del Producto</Label>
                      <Input id="edit_catalog_product_name" name="name" defaultValue={editingCatalogProduct.name} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_catalog_product_price">Precio</Label>
                      <Input id="edit_catalog_product_price" name="price" type="number" step="0.01" min="0.01" defaultValue={editingCatalogProduct.price} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_catalog_product_description">Descripción (Opcional)</Label>
                      <Input id="edit_catalog_product_description" name="description" defaultValue={editingCatalogProduct.description || ""} />
                    </div>
                    <Button type="submit" className="w-full" disabled={isUpdatingCatalogProduct}>
                      {isUpdatingCatalogProduct ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Individual IPV Reports Section
function IPVReportsSection({ 
  sales, 
  products, 
  ipv
}: { 
  sales: Sale[]
  products: Product[]
  ipv: IPV
}) {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)
  
  // Bill denominations (load from database for the IPV user)
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

  // Load denominations from database when component mounts or IPV changes
  const loadDenominations = useCallback(async () => {
    if (!ipv.user_id) return

    const { data, error } = await supabase
      .from("denominations")
      .select("*")
      .eq("ipv_id", ipv.id)
      .eq("user_id", ipv.user_id)

    if (error) {
      console.error("Error loading denominations:", error)
      return
    }

    if (data && data.length > 0) {
      // Update bills state with loaded data
      setBills(prevBills => 
        prevBills.map(bill => {
          const found = data.find(d => d.denomination === bill.denomination)
          return found ? { ...bill, count: found.count } : bill
        })
      )
    }
  }, [ipv.id, ipv.user_id])

  useEffect(() => {
    setIsClient(true)
    loadDenominations()
  }, [loadDenominations])

  const saveDenominations = async () => {
    if (!ipv.user_id) {
      toast.error("No se puede guardar: IPV sin usuario asignado")
      return
    }

    setIsLoading(true)
    try {
      // Prepare upsert data for all denominations
      const denominationsData = bills.map(bill => ({
        ipv_id: ipv.id,
        user_id: ipv.user_id,
        denomination: bill.denomination,
        count: bill.count
      }))

      // Upsert all denominations (insert or update if exists)
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
      toast.error("Error al guardar las denominaciones")
    } finally {
      setIsLoading(false)
    }
  }

  const updateBillCount = (denomination: number, count: number) => {
    setBills(bills.map((b) => (b.denomination === denomination ? { ...b, count: Math.max(0, count) } : b)))
  }

  const totalBills = bills.reduce((sum, b) => sum + b.denomination * b.count, 0)

  // Calculate detailed stats per product
  const productStats = products.map((product) => {
    const productSales = sales.filter((s) => s.product_id === product.id)
    const cashSales = productSales.filter((s) => s.payment_method === "cash")
    const transferSales = productSales.filter((s) => s.payment_method === "transfer")

    return {
      name: product.name,
      totalSold: product.initial_stock - product.current_stock,
      cashQuantity: cashSales.reduce((sum, s) => sum + s.quantity, 0),
      cashAmount: cashSales.reduce((sum, s) => sum + Number(s.total_amount), 0),
      transferQuantity: transferSales.reduce((sum, s) => sum + s.quantity, 0),
      transferAmount: transferSales.reduce((sum, s) => sum + Number(s.total_amount), 0),
    }
  })

  const totalCash = productStats.reduce((sum, p) => sum + p.cashAmount, 0)
  const totalTransfer = productStats.reduce((sum, p) => sum + p.transferAmount, 0)
  const totalGeneral = totalCash + totalTransfer

  // Format date for display with exact time
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

  // Sort sales by date (most recent first)
  const sortedSales = [...sales].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  // Export to PDF function
  const handleExportPDF = (comment?: string) => {
    const reportData: ReportData = {
      ipvName: ipv.name,
      assignedUserEmail: ipv.user_profile?.email,
      createdByEmail: ipv.created_by_profile?.email,
      totalCash,
      totalTransfer,
      totalGeneral,
      productStats,
      salesHistory: sortedSales.map(sale => ({
        date: formatDateTime(sale.created_at),
        productName: sale.products?.name || "Producto desconocido",
        quantity: sale.quantity,
        paymentMethod: sale.payment_method,
        total: Number(sale.total_amount)
      })),
      bills,
      comment
    }
    exportReportToPDF(reportData)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg sm:text-xl font-semibold">Estadísticas de {ipv.name}</h2>
        <Button onClick={() => setIsPDFModalOpen(true)} className="shrink-0 h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
          <FileDown className="h-4 w-4" />
          <span className="ml-1">Exportar PDF</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base">Total Efectivo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${formatCurrency(totalCash)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base">Total Transferencia</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${formatCurrency(totalTransfer)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base">Total General</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${formatCurrency(totalGeneral)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Product Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Reporte Detallado por Producto</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {products.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No hay productos en este IPV</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 sm:p-3 text-left font-semibold whitespace-nowrap">Producto</th>
                    <th className="p-2 sm:p-3 text-right font-semibold whitespace-nowrap">Vendido</th>
                    <th className="p-2 sm:p-3 text-right font-semibold whitespace-nowrap">Efec. (Cant.)</th>
                    <th className="p-2 sm:p-3 text-right font-semibold whitespace-nowrap">Efec. ($)</th>
                    <th className="p-2 sm:p-3 text-right font-semibold whitespace-nowrap">Trans. (Cant.)</th>
                    <th className="p-2 sm:p-3 text-right font-semibold whitespace-nowrap">Trans. ($)</th>
                    <th className="p-2 sm:p-3 text-right font-semibold whitespace-nowrap">Total ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {productStats.map((stat, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-3 font-medium">{stat.name}</td>
                      <td className="p-3 text-right">{stat.totalSold}</td>
                      <td className="p-3 text-right text-green-600">{stat.cashQuantity}</td>
                      <td className="p-3 text-right text-green-600 font-semibold">${formatCurrency(stat.cashAmount)}</td>
                      <td className="p-3 text-right text-blue-600">{stat.transferQuantity}</td>
                      <td className="p-3 text-right text-blue-600 font-semibold">${formatCurrency(stat.transferAmount)}</td>
                      <td className="p-3 text-right font-bold">${formatCurrency(stat.cashAmount + stat.transferAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales History with Exact Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Historial de Ventas</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {sortedSales.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No hay ventas registradas en este IPV</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 sm:p-3 text-left font-semibold whitespace-nowrap">Fecha y Hora</th>
                    <th className="p-2 sm:p-3 text-left font-semibold whitespace-nowrap">Producto</th>
                    <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap">Cant.</th>
                    <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap">Pago</th>
                    <th className="p-2 sm:p-3 text-right font-semibold whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSales.map((sale) => (
                    <tr key={sale.id} className="border-t hover:bg-gray-50">
                      <td className="p-2 sm:p-3 text-gray-600 whitespace-nowrap text-xs sm:text-sm">
                        {isClient ? formatDateTime(sale.created_at) : sale.created_at}
                      </td>
                      <td className="p-2 sm:p-3 font-medium">{sale.products?.name || "Producto desconocido"}</td>
                      <td className="p-2 sm:p-3 text-center">{sale.quantity}</td>
                      <td className="p-2 sm:p-3 text-center">
                        <Badge 
                          variant={sale.payment_method === "cash" ? "default" : "secondary"}
                          className={sale.payment_method === "cash" ? "bg-green-500" : "bg-blue-500"}
                        >
                          {sale.payment_method === "cash" ? "Efec." : "Trans."}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-semibold">${formatCurrency(Number(sale.total_amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bill Denominations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Declaración de Billetes (Solo lectura)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bills.map((bill) => (
              <div key={bill.denomination} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg opacity-75">
                <div className="w-14 flex-shrink-0 text-center">
                  <span className="font-bold text-gray-700 text-sm">${bill.denomination}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateBillCount(bill.denomination, bill.count - 1)}
                    className="h-8 w-8"
                    disabled={true}
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
                    disabled={true}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateBillCount(bill.denomination, bill.count + 1)}
                    className="h-8 w-8"
                    disabled={true}
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
          
          {/* Info message instead of Save button */}
          <div className="w-full mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center text-sm text-blue-700">
            Los administradores no pueden modificar las denominaciones. Solo el usuario asignado puede editarlas.
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

      {/* PDF Export Modal */}
      <PDFExportModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        onExport={handleExportPDF}
      />
    </div>
  )
}
