export type PaymentIntervalUnit = 'days' | 'weeks' | 'months'
export type PaymentStatus = 'scheduled' | 'paid' | 'missed'

export type Payment = {
  installmentNumber: number
  dueDate: string
  amount: number
  status: PaymentStatus
}

export type Purchase = {
  id: string
  name: string
  totalPrice: number
  installmentCount: number
  purchaseDate: string
  firstPaymentDate?: string
  paymentIntervalValue: number
  paymentIntervalUnit: PaymentIntervalUnit
  annualReturnRate: number
  createdAt: string
  payments: Payment[]
}

export type Settings = {
  defaultAnnualReturnRate: number
  currency: string
}
