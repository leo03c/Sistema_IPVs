import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect to login if not authenticated, otherwise to dashboard
  if (!user) {
    redirect("/auth/login")
  } else {
    redirect("/dashboard")
  }
}
