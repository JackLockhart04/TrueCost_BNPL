import { createPaymentSchedule, getToday } from './calculations'
import type { Purchase } from './types'

function dateOffset(days: number): string {
  const date = new Date(`${getToday()}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function createSamplePurchase(details: Omit<Purchase, 'payments' | 'createdAt'>, paidPayments: number): Purchase {
  const purchase = { ...details, createdAt: new Date().toISOString() }
  return {
    ...purchase,
    payments: createPaymentSchedule(purchase).map((payment) => ({
      ...payment,
      status: payment.installmentNumber <= paidPayments ? 'paid' : 'scheduled',
    })),
  }
}

// Sample data is generated in memory and is never written to localStorage automatically.
export function createSamplePurchases(): Purchase[] {
  return [
    createSamplePurchase({
      id: 'sample-laptop', name: 'Laptop', totalPrice: 1200, installmentCount: 12,
      purchaseDate: dateOffset(-45), firstPaymentDate: dateOffset(-15),
      paymentIntervalValue: 1, paymentIntervalUnit: 'months',
    }, 1),
    createSamplePurchase({
      id: 'sample-shoes', name: 'Running shoes', totalPrice: 180, installmentCount: 4,
      purchaseDate: dateOffset(-14), firstPaymentDate: dateOffset(0),
      paymentIntervalValue: 2, paymentIntervalUnit: 'weeks',
    }, 0),
    createSamplePurchase({
      id: 'sample-sofa', name: 'Sofa', totalPrice: 900, installmentCount: 6,
      purchaseDate: dateOffset(-10), firstPaymentDate: dateOffset(10),
      paymentIntervalValue: 1, paymentIntervalUnit: 'months',
    }, 0),
  ]
}
