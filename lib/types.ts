// Shared types for the IPV inventory management system

// Product in the admin's catalog (not tied to any IPV)
export type CatalogProduct = {
  id: string
  name: string
  price: number
  description?: string
  admin_id: string
  created_at?: string
  updated_at?: string
}

// Product assigned to an IPV (with stock information)
export type Product = {
  id: string
  name: string
  price: number
  initial_stock: number
  current_stock: number
  ipv_id?: string
  catalog_product_id?: string
}

export type IPV = {
  id: string
  name: string
  description: string
  status?: 'open' | 'closed'
  user_id?: string
  created_by?: string
  user_profile?: { email: string }
  created_by_profile?: { email: string }
}

export type Sale = {
  id: string
  product_id: string
  quantity: number
  payment_method: string
  unit_price: number
  total_amount: number
  created_at: string
}

export type Profile = {
  id: string
  email: string
  role: string
}

export type IPVWithProducts = {
  ipv: IPV
  products: Product[]
}
