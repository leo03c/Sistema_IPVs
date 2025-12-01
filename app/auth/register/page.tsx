"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setIsLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const response = await fetch("/api/auth/register", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Error al registrarse")
        setIsLoading(false)
        return
      }

      if (data.message) {
        setMessage(data.message)
        setIsLoading(false)
        return
      }

      // Successful registration - redirect to dashboard
      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      console.error("Registration error:", error)
      setError("Error de conexión. Por favor, verifica tu conexión a internet e intenta de nuevo.")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Crear Cuenta</CardTitle>
            <CardDescription>Completa el formulario para registrarte</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
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
                <Label htmlFor="role">Rol</Label>
                <select
                  id="role"
                  name="role"
                  className="flex h-12 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  defaultValue="user"
                  required
                  disabled={isLoading}
                >
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
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
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repeat-password">Repetir Contraseña</Label>
                <Input
                  id="repeat-password"
                  name="repeatPassword"
                  type="password"
                  required
                  className="w-full h-12 text-base"
                  disabled={isLoading}
                  minLength={6}
                />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}
              {message && <p className="text-sm text-green-600 bg-green-50 p-3 rounded">{message}</p>}
              <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                {isLoading ? "Creando cuenta..." : "Registrarse"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link href="/auth/login" className="text-primary underline-offset-4 hover:underline">
                Inicia sesión
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
