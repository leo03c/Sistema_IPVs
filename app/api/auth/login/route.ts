import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    console.log("[v0] Login attempt for:", email)

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log("[v0] Login result:", data?.user?.id, "Error:", error?.message)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    // Verify session is established
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Error al establecer la sesión" }, { status: 500 })
    }

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", session.user.id)
      .maybeSingle()

    if (!existingProfile) {
      console.log("[v0] Profile not found, creating for user:", session.user.id)
      const userRole = session.user.user_metadata?.role || "user"

      await supabase.from("profiles").upsert(
        {
          id: session.user.id,
          email: session.user.email,
          role: userRole,
        },
        {
          onConflict: "id",
        },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "Error al procesar la solicitud. Por favor, intenta de nuevo." }, { status: 500 })
  }
}
