import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SalesInterface } from "@/components/sales-interface"
import { AdminPanel } from "@/components/admin-panel"
import { Button } from "@/components/ui/button"
import { ProfileSetupMessage } from "@/components/profile/profile-setup-message"
import { IPVSelector } from "@/components/ipv-selector"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect("/auth/login")
  }

  // Get user profile with role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error("Profile query error:", profileError)
  }

  if (!profile) {
    return <ProfileSetupMessage />
  }

  // Admin view - fetch data server-side and pass as props
  if (profile.role === "admin") {
    // Load ALL IPVs with user emails - admins should see all inventories
    // RLS policies (from 005-fix-admin-view-all.sql) should allow admin access
    const { data: ipvsData, error: ipvsError } = await supabase
      .from("ipvs")
      .select("*, profiles!ipvs_user_id_fkey(email)")
      .order("created_at", { ascending: false })

    if (ipvsError) {
      console.error("Error loading IPVs:", ipvsError)
    }

    // 🔵 DEBUG: IPVs cargados
    console.log("🔵 IPVs cargados:", { 
      count: ipvsData?.length || 0, 
      data: ipvsData,
      error: ipvsError 
    })

    // Load users (only regular users, not admins)
    const { data: usersData, error: usersError } = await supabase.from("profiles").select("*").eq("role", "user")

    if (usersError) {
      console.error("Error loading users:", usersError)
    }

    // 🔵 DEBUG: Users cargados
    console.log("🔵 Users cargados:", { 
      count: usersData?.length || 0, 
      data: usersData,
      error: usersError 
    })

    // Get IPV IDs for filtering products and sales (same method as user dashboard)
    const ipvIds = (ipvsData || []).map(ipv => ipv.id)

    // Define types for products and sales matching AdminPanel expectations
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

    // Load products for all IPVs (admin sees all products)
    let productsData: Product[] = []
    let productsError = null
    if (ipvIds.length > 0) {
      const result = await supabase
        .from("products")
        .select("*")
        .in("ipv_id", ipvIds)
        .order("name")
      productsData = (result.data || []) as Product[]
      productsError = result.error
    }

    if (productsError) {
      console.error("Error loading products:", productsError)
    }

    // 🔵 DEBUG: Products cargados
    console.log("🔵 Products cargados:", { 
      count: productsData?.length || 0, 
      data: productsData,
      error: productsError,
      ipvIdsUsed: ipvIds
    })

    // Load sales for all IPVs (admin sees all sales)
    let salesData: Sale[] = []
    let salesError = null
    if (ipvIds.length > 0) {
      const result = await supabase
        .from("sales")
        .select("*, products(name)")
        .in("ipv_id", ipvIds)
      salesData = (result.data || []) as Sale[]
      salesError = result.error
    }

    if (salesError) {
      console.error("Error loading sales:", salesError)
    }

    // 🔵 DEBUG: Sales cargados
    console.log("🔵 Sales cargados:", { 
      count: salesData?.length || 0, 
      data: salesData,
      error: salesError 
    })

    // 🔵 DEBUG: Datos a pasar al AdminPanel
    console.log("🔵 Dashboard Admin - Datos a pasar:", {
      profileRole: profile.role,
      profileEmail: profile.email,
      ipvsCount: ipvsData?.length || 0,
      ipvsArray: ipvsData,
      usersCount: usersData?.length || 0,
      productsCount: productsData?.length || 0,
      salesCount: salesData?.length || 0,
      ipvIdsExtracted: ipvIds
    })

    return (
      <AdminPanel
        profile={profile}
        initialIpvs={ipvsData || []}
        initialUsers={usersData || []}
        initialProducts={productsData || []}
        initialSales={salesData || []}
      />
    )
  }

  // Get ALL IPVs assigned to this user (not just one)
  const { data: ipvs } = await supabase.from("ipvs").select("*").eq("user_id", user.id).order("name")

  if (!ipvs || ipvs.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">No tienes un IPV asignado</h1>
          <p className="text-gray-600">Contacta al administrador para que te asigne un inventario</p>
          <form action="/auth/signout" method="post">
            <Button variant="outline">Cerrar Sesión</Button>
          </form>
        </div>
      </div>
    )
  }

  // Get products for all IPVs
  const ipvIds = ipvs.map(ipv => ipv.id)
  const { data: allProducts } = await supabase
    .from("products")
    .select("*")
    .in("ipv_id", ipvIds)
    .order("name")

  // Group products by IPV
  const ipvsWithProducts = ipvs.map(ipv => ({
    ipv,
    products: (allProducts || []).filter(p => p.ipv_id === ipv.id)
  }))

  // If user has only one IPV, show the sales interface directly
  if (ipvs.length === 1) {
    return <SalesInterface ipv={ipvs[0]} initialProducts={ipvsWithProducts[0].products} userId={user.id} />
  }

  // If user has multiple IPVs, show the IPV selector
  return <IPVSelector ipvsWithProducts={ipvsWithProducts} userId={user.id} />
}
