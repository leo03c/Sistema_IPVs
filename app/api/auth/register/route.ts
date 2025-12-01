import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { headers } from "next/headers"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const repeatPassword = formData.get("repeatPassword") as string
    const role = formData.get("role") as string

    console.log("[v0] Registration attempt for:", email, "with role:", role)

    if (!email || !password || !repeatPassword || !role) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    if (password !== repeatPassword) {
      return NextResponse.json({ error: "Las contraseñas no coinciden" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
    }

    const supabase = await createClient()

    const headersList = await headers()
    const origin =
      headersList.get("origin") ||
      headersList.get("referer")?.split("/").slice(0, 3).join("/") ||
      "https://v0-product-inventory-management-beryl.vercel.app"

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
        },
        emailRedirectTo: `${origin}/auth/callback`,
      },
    })

    console.log("[v0] SignUp result:", signUpData?.user?.id, "Error:", signUpError?.message)

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 })
    }

    if (!signUpData.user) {
      return NextResponse.json({ error: "Error al crear el usuario" }, { status: 500 })
    }

    // Try to create profile directly with normal client
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: signUpData.user.id,
        email: signUpData.user.email,
        role: role,
      },
      {
        onConflict: "id",
      },
    )

    if (profileError) {
      console.log("[v0] Profile creation warning (may be RLS):", profileError.message)
      // Don't fail registration if profile creation fails - it will be created on login
    }

    // Auto login after successful registration
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log("[v0] Auto sign-in result:", signInError?.message || "success")

    if (signInError) {
      // If email confirmation is required
      if (signInError.message.includes("Email not confirmed")) {
        return NextResponse.json({
          success: true,
          message: "Cuenta creada. Por favor verifica tu email para iniciar sesión.",
        })
      }
      return NextResponse.json({ error: signInError.message }, { status: 401 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Registration error:", error)
    return NextResponse.json({ error: "Error al procesar la solicitud. Por favor, intenta de nuevo." }, { status: 500 })
  }
}
