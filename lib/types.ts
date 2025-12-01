// Shared types for the IPV inventory management system

export type Product = {
  id: string
  name: string
  price: number
  initial_stock: number
  current_stock: number
  ipv_id?: string
}

export type IPV = {
  id: string
  name: string
  description: string
  status?: 'open' | 'closed'
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
