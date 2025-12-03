"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { UserCircle } from "lucide-react"

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const response = await fetch("/api/auth/login", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Error al iniciar sesión")
        setIsLoading(false)
        return
      }

      // Successful login - redirect to dashboard using replace to avoid back button issues
      sessionStorage.setItem("came_from_auth", "true")
      router.replace("/dashboard")
      router.refresh()
    } catch (error) {
      console.error("Login error:", error)
      setError("Error de conexión. Por favor, verifica tu conexión a internet e intenta de nuevo.")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-sm space-y-4">
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">IPV Sistema</CardTitle>
            <CardDescription>Ingresa tus credenciales para acceder</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  required
                  className="w-full h-12 text-base"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full h-12 text-base"
                  disabled={isLoading}
                />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}
              <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                {isLoading ? "Ingresando..." : "Ingresar"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <Link href="/auth/register" className="text-primary underline-offset-4 hover:underline">
                Regístrate
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-2">
          <CardContent className="p-4">
            <Link href="/invitado" className="block">
              <Button variant="outline" className="w-full h-12 flex items-center gap-2 bg-white text-base font-medium">
                <UserCircle className="h-5 w-5" />
                Usar como Invitado
              </Button>
            </Link>
            <p className="text-xs text-center text-gray-500 mt-2">Registra ventas sin necesidad de cuenta</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
