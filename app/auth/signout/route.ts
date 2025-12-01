import { createClient } from "@/lib/supabase/server"
import { NextResponse, NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  // Use the request origin to get the correct app URL, not the Supabase URL
  const origin = request.nextUrl.origin
  return NextResponse.redirect(`${origin}/`, 303)
}
