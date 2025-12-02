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
    // Parallelize all independent queries for better performance
    const [ipvsResult, usersResult, catalogProductsResult] = await Promise.all([
      // Load only IPVs created by this admin
      supabase
        .from("ipvs")
        .select("*, user_profile:profiles!user_id(email), created_by_profile:profiles!created_by(email)")
        .eq("created_by", profile.id)
        .order("created_at", { ascending: false }),
      // Load users (only regular users, not admins)
      supabase.from("profiles").select("*").eq("role", "user"),
      // Load catalog products (independent of IPVs)
      supabase
        .from("product_catalog")
        .select("*")
        .eq("admin_id", profile.id)
        .order("name")
    ])

    const { data: ipvsData, error: ipvsError } = ipvsResult
    const { data: usersData, error: usersError } = usersResult
    const { data: catalogProductsData, error: catalogProductsError } = catalogProductsResult

    if (ipvsError) {
      console.error("Error loading IPVs:", ipvsError)
    }

    if (usersError) {
      console.error("Error loading users:", usersError)
    }

    if (catalogProductsError) {
      console.error("Error loading catalog products:", catalogProductsError)
    }

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

    // Parallelize loading of products and sales based on IPVs
    let productsData: Product[] = []
    let productsError = null
    let salesData: Sale[] = []
    let salesError = null

    if (ipvIds.length > 0) {
      // Parallel queries for products and sales
      const [productsResult, salesResult] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .in("ipv_id", ipvIds)
          .order("name"),
        supabase
          .from("sales")
          .select("*, products(name)")
          .in("ipv_id", ipvIds)
      ])

      productsData = (productsResult.data || []) as Product[]
      productsError = productsResult.error
      salesData = (salesResult.data || []) as Sale[]
      salesError = salesResult.error

      if (productsError) {
        console.error("Error loading products:", productsError)
      }

      if (salesError) {
        console.error("Error loading sales:", salesError)
      }
    }

    return (
      <AdminPanel
        profile={profile}
        initialIpvs={ipvsData || []}
        initialUsers={usersData || []}
        initialProducts={productsData || []}
        initialSales={salesData || []}
        initialCatalogProducts={catalogProductsData || []}
      />
    )
  }

  // Get ALL IPVs assigned to this user (not just one)
  const { data: ipvs } = await supabase
    .from("ipvs")
    .select("*, user_profile:profiles!user_id(email), created_by_profile:profiles!created_by(email)")
    .eq("user_id", user.id)
    .order("name")

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
