import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// Extend jsPDF type to include lastAutoTable property added by jspdf-autotable
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number
  }
}

interface AutoTableOptions {
  head?: (string | number)[][]
  body?: (string | number)[][]
  startY?: number
  theme?: string
  headStyles?: { fillColor: number[] }
  styles?: { fontSize?: number }
  margin?: { left: number }
}

export interface BillCount {
  denomination: number
  count: number
}

export interface ProductStat {
  name: string
  totalSold: number
  cashQuantity: number
  cashAmount: number
  transferQuantity: number
  transferAmount: number
}

export interface SaleHistoryItem {
  date: string
  productName: string
  quantity: number
  paymentMethod: string
  total: number
}

export interface ReportData {
  ipvName: string
  assignedUserEmail?: string
  createdByEmail?: string
  totalCash: number
  totalTransfer: number
  totalGeneral: number
  productStats: ProductStat[]
  salesHistory: SaleHistoryItem[]
  bills?: BillCount[]
}

function formatCurrencyForPdf(amount: number): string {
  return Number.isInteger(amount)
    ? `$${amount.toLocaleString('es-MX')}`
    : `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function exportReportToPDF(data: ReportData): void {
  const doc = new jsPDF() as jsPDFWithAutoTable
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(`Reporte de ${data.ipvName}`, pageWidth / 2, 20, { align: 'center' })
  
  // Date
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const currentDate = new Date().toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  doc.text(`Generado: ${currentDate}`, pageWidth / 2, 28, { align: 'center' })
  
  // User and Admin information
  let currentY = 36
  if (data.assignedUserEmail) {
    doc.text(`Usuario Asignado: ${data.assignedUserEmail}`, pageWidth / 2, currentY, { align: 'center' })
    currentY += 6
  }
  if (data.createdByEmail) {
    doc.text(`Creado por: ${data.createdByEmail}`, pageWidth / 2, currentY, { align: 'center' })
    currentY += 6
  }
  
  // Summary section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen de Ventas', 14, currentY + 4)
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total Efectivo: ${formatCurrencyForPdf(data.totalCash)}`, 14, currentY + 14)
  doc.text(`Total Transferencia: ${formatCurrencyForPdf(data.totalTransfer)}`, 14, currentY + 22)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total General: ${formatCurrencyForPdf(data.totalGeneral)}`, 14, currentY + 30)
  
  currentY = currentY + 44
  
  // Product Statistics Table
  if (data.productStats.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Detalle por Producto', 14, currentY)
    
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Producto', 'Vendido', 'Efec. (Cant.)', 'Efec. ($)', 'Trans. (Cant.)', 'Trans. ($)', 'Total ($)']],
      body: data.productStats.map(stat => [
        stat.name,
        stat.totalSold,
        stat.cashQuantity,
        formatCurrencyForPdf(stat.cashAmount),
        stat.transferQuantity,
        formatCurrencyForPdf(stat.transferAmount),
        formatCurrencyForPdf(stat.cashAmount + stat.transferAmount)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
      margin: { left: 14 }
    })
    
    currentY = doc.lastAutoTable.finalY + 15
  }
  
  // Bill Denominations Table
  if (data.bills && data.bills.some(b => b.count > 0)) {
    // Check if we need a new page
    if (currentY > 220) {
      doc.addPage()
      currentY = 20
    }
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Declaración de Billetes', 14, currentY)
    
    const billsWithValue = data.bills.filter(b => b.count > 0)
    const totalBills = data.bills.reduce((sum, b) => sum + (b.denomination * b.count), 0)
    
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Denominación', 'Cantidad', 'Subtotal']],
      body: [
        ...billsWithValue.map(bill => [
          `$${bill.denomination}`,
          bill.count,
          formatCurrencyForPdf(bill.denomination * bill.count)
        ]),
        ['', 'Total:', formatCurrencyForPdf(totalBills)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 10 },
      margin: { left: 14 }
    })
    
    currentY = doc.lastAutoTable.finalY + 15
  }
  
  // Sales History Table
  if (data.salesHistory.length > 0) {
    // Check if we need a new page
    if (currentY > 200) {
      doc.addPage()
      currentY = 20
    }
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Historial de Ventas', 14, currentY)
    
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Fecha y Hora', 'Producto', 'Cant.', 'Pago', 'Total']],
      body: data.salesHistory.map(sale => [
        sale.date,
        sale.productName,
        sale.quantity,
        sale.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia',
        formatCurrencyForPdf(sale.total)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [139, 92, 246] },
      styles: { fontSize: 9 },
      margin: { left: 14 }
    })
  }
  
  // Save the PDF
  const fileName = `reporte_${data.ipvName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}
