"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { FileDown, MessageSquare } from "lucide-react"

interface PDFExportModalProps {
  isOpen: boolean
  onClose: () => void
  onExport: (comment?: string) => void
  title?: string
  description?: string
}

export function PDFExportModal({
  isOpen,
  onClose,
  onExport,
  title = "Exportar PDF",
  description = "¿Deseas añadir un comentario al reporte?"
}: PDFExportModalProps) {
  const [comment, setComment] = useState("")
  const [showCommentInput, setShowCommentInput] = useState(false)

  const handleExport = () => {
    onExport(showCommentInput && comment ? comment : undefined)
    // Reset state after export
    setComment("")
    setShowCommentInput(false)
    onClose()
  }

  const handleClose = () => {
    setComment("")
    setShowCommentInput(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {!showCommentInput ? (
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCommentInput(true)}
                className="h-20 flex-col gap-2"
              >
                <MessageSquare className="h-6 w-6" />
                <span>Añadir Comentario</span>
              </Button>
              <Button
                onClick={handleExport}
                className="h-20 flex-col gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <FileDown className="h-6 w-6" />
                <span>Exportar</span>
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="comment">Comentario</Label>
                <Textarea
                  id="comment"
                  placeholder="Escribe tu comentario aquí..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCommentInput(false)
                    setComment("")
                  }}
                  className="flex-1"
                >
                  Atrás
                </Button>
                <Button
                  onClick={handleExport}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar con Comentario
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
