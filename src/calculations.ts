import type { Payment, Purchase } from './types'

export type ScheduledPayment = Payment & { purchase: Purchase; date: Date }

function parseDate(date: string): Date {
  return new Date(`${date}T12:00:00`)
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getToday(): string {
  return formatDateInput(new Date())
}

function addPaymentInterval(date: Date, purchase: Omit<Purchase, 'payments'>): Date {
  const nextDate = new Date(date)
  const { paymentIntervalValue, paymentIntervalUnit } = purchase

  if (paymentIntervalUnit === 'days') nextDate.setDate(nextDate.getDate() + paymentIntervalValue)
  if (paymentIntervalUnit === 'weeks') nextDate.setDate(nextDate.getDate() + paymentIntervalValue * 7)
  if (paymentIntervalUnit === 'months') nextDate.setMonth(nextDate.getMonth() + paymentIntervalValue)

  return nextDate
}

function getFirstPaymentDate(purchase: Omit<Purchase, 'payments'>): Date {
  if (purchase.firstPaymentDate) return parseDate(purchase.firstPaymentDate)
  return addPaymentInterval(parseDate(purchase.purchaseDate), purchase)
}

export function createPaymentSchedule(purchase: Omit<Purchase, 'payments'>): Payment[] {
  const amount = purchase.totalPrice / purchase.installmentCount
  let dueDate = getFirstPaymentDate(purchase)

  return Array.from({ length: purchase.installmentCount }, (_, index) => {
    if (index > 0) dueDate = addPaymentInterval(dueDate, purchase)
    return {
      installmentNumber: index + 1,
      dueDate: formatDateInput(dueDate),
      amount,
      status: 'scheduled',
    }
  })
}

export function getScheduledPayments(purchases: Purchase[]): ScheduledPayment[] {
  return purchases.flatMap((purchase) => purchase.payments.map((payment) => ({
    ...payment,
    purchase,
    date: parseDate(payment.dueDate),
  })))
}

export function getPaymentsForMonth(purchases: Purchase[], referenceDate = new Date()): ScheduledPayment[] {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()
  return getScheduledPayments(purchases).filter((payment) =>
    payment.date.getFullYear() === year && payment.date.getMonth() === month,
  )
}

export function getUpcomingPayments(purchases: Purchase[], limit = 5): ScheduledPayment[] {
  const today = parseDate(getToday())
  return getScheduledPayments(purchases)
    .filter((payment) => payment.status === 'scheduled' && payment.date >= today)
    .sort((first, second) => first.date.getTime() - second.date.getTime())
    .slice(0, limit)
}

export function getRemainingInstallments(purchase: Purchase): number {
  return purchase.payments.filter((payment) => payment.status !== 'paid').length
}

export function getRemainingBalance(purchase: Purchase): number {
  return purchase.payments
    .filter((payment) => payment.status !== 'paid')
    .reduce((total, payment) => total + payment.amount, 0)
}

// Treat each unpaid payment as an investment made on its scheduled payment date.
export function getOpportunityValue(purchase: Purchase, years: number, annualReturnRate = 8): number {
  const today = parseDate(getToday())
  const endDate = new Date(today)
  endDate.setFullYear(endDate.getFullYear() + years)
  const annualRate = annualReturnRate / 100

  return purchase.payments
    .filter((payment) => payment.status !== 'paid')
    .reduce((futureValue, payment) => {
      const yearsToGrow = (endDate.getTime() - parseDate(payment.dueDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      return yearsToGrow >= 0
        ? futureValue + payment.amount * (1 + annualRate) ** yearsToGrow
        : futureValue
    }, 0)
}

export function getPortfolioOpportunityValue(purchases: Purchase[], years: number, annualReturnRate: number): number {
  return purchases.reduce(
    (total, purchase) => total + getOpportunityValue(purchase, years, annualReturnRate),
    0,
  )
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

export function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date)
}

export function formatMoney(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
}
