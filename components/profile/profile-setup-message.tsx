"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function ProfileSetupMessage() {
  const router = useRouter()

  useEffect(() => {
    // Auto-refresh after 2 seconds
    const timer = setTimeout(() => {
      router.refresh()
    }, 2000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Configurando tu perfil</h1>
        <p className="text-gray-600">Tu perfil se está creando. La página se recargará automáticamente en 2 segundos.</p>
        <div className="flex gap-2 justify-center">
          <Button onClick={() => router.refresh()}>Recargar ahora</Button>
          <form action="/auth/signout" method="post">
            <Button variant="outline">Cerrar Sesión</Button>
          </form>
        </div>
      </div>
    </div>
  )
}
