import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as currency, showing decimals only when necessary.
 * - $85.00 becomes $85
 * - $85.50 stays as $85.50
 */
export function formatCurrency(amount: number): string {
  return amount % 1 === 0
    ? amount.toLocaleString('es-MX')
    : amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
