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
      id: 'sample-headphones', name: 'Headphones', totalPrice: 90, installmentCount: 3,
      purchaseDate: dateOffset(-14), firstPaymentDate: dateOffset(-7),
      paymentIntervalValue: 1, paymentIntervalUnit: 'weeks',
    }, 1),
    createSamplePurchase({
      id: 'sample-shoes', name: 'Running shoes', totalPrice: 150, installmentCount: 3,
      purchaseDate: dateOffset(-7), firstPaymentDate: dateOffset(0),
      paymentIntervalValue: 1, paymentIntervalUnit: 'weeks',
    }, 0),
    createSamplePurchase({
      id: 'sample-fitness', name: 'Fitness equipment', totalPrice: 480, installmentCount: 8,
      purchaseDate: dateOffset(-50), firstPaymentDate: dateOffset(-42),
      paymentIntervalValue: 2, paymentIntervalUnit: 'weeks',
    }, 3),
    createSamplePurchase({
      id: 'sample-sofa', name: 'Sofa', totalPrice: 900, installmentCount: 8,
      purchaseDate: dateOffset(-65), firstPaymentDate: dateOffset(-60),
      paymentIntervalValue: 1, paymentIntervalUnit: 'months',
    }, 2),
    createSamplePurchase({
      id: 'sample-laptop', name: 'Laptop', totalPrice: 1400, installmentCount: 14,
      purchaseDate: dateOffset(-65), firstPaymentDate: dateOffset(-60),
      paymentIntervalValue: 1, paymentIntervalUnit: 'months',
    }, 2),
  ]
}
