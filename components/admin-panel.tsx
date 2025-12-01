"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Package, LogOut, ArrowLeft, Trash2, BarChart3, Edit2, Lock, LockOpen } from "lucide-react"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/utils"

type Profile = {
  id: string
  email: string
  role: string
}

type IPV = {
  id: string
  name: string
  user_id: string
  status?: 'open' | 'closed'
  profiles?: { email: string }
}

type Product = {
  id: string
  name: string
  price: number
  initial_stock: number
  current_stock: number
  ipv_id: string
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
}

export function AdminPanel({ profile, initialIpvs, initialUsers, initialProducts, initialSales }: AdminPanelProps) {
  const [ipvs, setIpvs] = useState<IPV[]>(initialIpvs)
  const users = initialUsers // Read-only, no state needed
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const sales = initialSales // Read-only, no state needed
  const [isIPVDialogOpen, setIsIPVDialogOpen] = useState(false)
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [isEditProductDialogOpen, setIsEditProductDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [selectedIPV, setSelectedIPV] = useState<IPV | null>(null)
  const [activeTab, setActiveTab] = useState<"products" | "reports">("products")
  const router = useRouter()
  const supabase = createClient()

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
    }).select("*, profiles!ipvs_user_id_fkey(email)")

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
  }

  const createProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    if (!selectedIPV) {
      alert("Por favor selecciona un IPV")
      return
    }

    const initialStock = Number.parseInt(formData.get("initial_stock") as string)

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
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  // Toggle IPV status between open and closed
  const toggleIPVStatus = async (ipvId: string, currentStatus: 'open' | 'closed') => {
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
  }

  // Delete a product
  const deleteProduct = async (productId: string) => {
    const { error } = await supabase.from("products").delete().eq("id", productId)

    if (!error) {
      setProducts(products.filter((p) => p.id !== productId))
    } else {
      console.error("Error deleting product:", error)
      alert("Error al eliminar el producto: " + error.message)
    }
  }

  // Update a product
  const updateProduct = async (productId: string, updates: { name?: string; price?: number; initial_stock?: number; current_stock?: number }) => {
    const { error } = await supabase.from("products").update(updates).eq("id", productId)

    if (!error) {
      setProducts(products.map((p) => p.id === productId ? { ...p, ...updates } : p))
    } else {
      console.error("Error updating product:", error)
      alert("Error al actualizar el producto: " + error.message)
    }
  }

  // Get products for selected IPV
  const ipvProducts = selectedIPV ? products.filter((p) => p.ipv_id === selectedIPV.id) : []
  // Get sales for selected IPV
  const ipvSales = selectedIPV ? sales.filter((s) => {
    const productIds = ipvProducts.map((p) => p.id)
    return productIds.includes(s.product_id)
  }) : []

  // If an IPV is selected, show the IPV detail view
  if (selectedIPV) {
    return (
      <div className="min-h-screen bg-gray-50 overflow-x-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
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
                  Asignado a: {selectedIPV.profiles?.email || "Sin asignar"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => toggleIPVStatus(selectedIPV.id, selectedIPV.status || 'open')}
                className={`shrink-0 h-8 sm:h-9 px-2 sm:px-3 ${selectedIPV.status === 'open' ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
              >
                {selectedIPV.status === 'open' ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                <span className="hidden sm:inline sm:ml-2">{selectedIPV.status === 'open' ? 'Cerrar' : 'Abrir'}</span>
              </Button>
              <Button variant="outline" onClick={handleLogout} size="sm" className="shrink-0 h-8 sm:h-9 px-2 sm:px-3">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline sm:ml-2">Salir</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-3 sm:pt-4">
          <div className="flex gap-2 mb-3 sm:mb-4">
            <Button
              variant={activeTab === "products" ? "default" : "outline"}
              onClick={() => setActiveTab("products")}
              className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
            >
              <Package className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Productos</span>
              <span className="sm:hidden ml-1">Prod.</span>
            </Button>
            <Button
              variant={activeTab === "reports" ? "default" : "outline"}
              onClick={() => setActiveTab("reports")}
              className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
            >
              <BarChart3 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Reportes</span>
              <span className="sm:hidden ml-1">Rep.</span>
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-3 sm:p-4">
          {/* Products Tab */}
          {activeTab === "products" && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold">Productos del IPV</h2>
                <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="shrink-0 h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
                      <Plus className="h-4 w-4" />
                      <span className="ml-1">Agregar</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-base sm:text-lg">Agregar Producto a {selectedIPV.name}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={createProduct} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="product_name">Nombre del Producto</Label>
                        <Input id="product_name" name="name" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price">Precio</Label>
                        <Input id="price" name="price" type="number" step="0.01" min="0" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="initial_stock">Cantidad de Productos</Label>
                        <Input
                          id="initial_stock"
                          name="initial_stock"
                          type="number"
                          min="0"
                          required
                          placeholder="¿Cuántos productos ingresas?"
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        Agregar Producto
                      </Button>
                    </form>
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
                                  onClick={() => deleteProduct(product.id)}
                                >
                                  Eliminar
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
                    <form onSubmit={(e) => {
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
                      
                      updateProduct(editingProduct.id, {
                        name: name as string,
                        price: Number.parseFloat(price as string),
                        initial_stock: Number.parseInt(initialStock as string),
                        current_stock: Number.parseInt(currentStock as string),
                      })
                      setIsEditProductDialogOpen(false)
                      setEditingProduct(null)
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
                      <Button type="submit" className="w-full">
                        Guardar Cambios
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
              ipvName={selectedIPV.name}
            />
          )}
        </div>
      </div>
    )
  }

  // Main dashboard view - list of IPVs
  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
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

      <div className="max-w-7xl mx-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
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
                <Button type="submit" className="w-full">
                  Crear IPV
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
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteIPV(ipv.id)
                            }}
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-4 pt-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="truncate text-xs flex-1">{ipv.profiles?.email || "Sin asignar"}</Badge>
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
      </div>
    </div>
  )
}

// Individual IPV Reports Section
function IPVReportsSection({ 
  sales, 
  products, 
  ipvName 
}: { 
  sales: Sale[]
  products: Product[]
  ipvName: string
}) {
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

  return (
    <div className="space-y-6">
      <h2 className="text-lg sm:text-xl font-semibold">Estadísticas de {ipvName}</h2>

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
                      <td className="p-2 sm:p-3 text-gray-600 whitespace-nowrap text-xs sm:text-sm">{formatDateTime(sale.created_at)}</td>
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
    </div>
  )
}
