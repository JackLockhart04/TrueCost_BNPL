import type { Purchase } from './types'

export function getInstallmentAmount(purchase: Purchase): number {
  return purchase.totalPrice / purchase.installmentCount
}

export function getRemainingInstallments(purchase: Purchase): number {
  return Math.max(0, purchase.installmentCount - purchase.installmentsPaid)
}

export function getRemainingBalance(purchase: Purchase): number {
  return getInstallmentAmount(purchase) * getRemainingInstallments(purchase)
}

// Treat each remaining monthly payment as an investment made at the end of that month.
export function getOpportunityValue(purchase: Purchase, years: number): number {
  const monthlyRate = purchase.annualReturnRate / 100 / 12
  const months = years * 12
  const installmentAmount = getInstallmentAmount(purchase)
  const remainingInstallments = getRemainingInstallments(purchase)
  let futureValue = 0

  for (let paymentMonth = 1; paymentMonth <= remainingInstallments; paymentMonth += 1) {
    const monthsToGrow = months - paymentMonth

    if (monthsToGrow >= 0) {
      futureValue += installmentAmount * (1 + monthlyRate) ** monthsToGrow
    }
  }

  return futureValue
}

export function formatMoney(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}
