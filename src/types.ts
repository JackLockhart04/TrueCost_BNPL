export type Purchase = {
  id: string
  name: string
  totalPrice: number
  installmentCount: number
  installmentsPaid: number
  paymentFrequency: 'monthly'
  annualReturnRate: number
  createdAt: string
}

export type Settings = {
  defaultAnnualReturnRate: number
  currency: string
}
