"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

async function verifySession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { error: "Error al establecer la sesión" }
  }
  
  return { session }
}

async function authenticateUser(email: string, password: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) {
    return { error: error.message }
  }
  
  return await verifySession()
}

export async function signInAction(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email y contraseña son requeridos" }
  }

  const result = await authenticateUser(email, password)
  if (result.error) {
    return result
  }

  redirect("/dashboard")
}

export async function signUpAction(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const repeatPassword = formData.get("repeatPassword") as string
  const role = formData.get("role") as string

  if (!email || !password || !repeatPassword || !role) {
    return { error: "Todos los campos son requeridos" }
  }

  if (password !== repeatPassword) {
    return { error: "Las contraseñas no coinciden" }
  }

  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres" }
  }

  const supabase = await createClient()

  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
      },
    },
  })

  if (signUpError) {
    return { error: signUpError.message }
  }

  // Auto login after successful registration
  const result = await authenticateUser(email, password)
  if (result.error) {
    return result
  }

  redirect("/dashboard")
}
