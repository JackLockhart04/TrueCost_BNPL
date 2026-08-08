import './style.css'
import { createPaymentSchedule, getRemainingInstallments } from './calculations'
import { createSamplePurchases } from './sample-data'
import { clearSavedData, loadPurchases, loadSettings, savePurchases, saveSettings } from './storage'
import type { PaymentStatus, Purchase } from './types'
import { renderApp, type Page } from './ui'

const useSampleData = window.confirm('Load temporary sample data? Select Cancel to clear saved data and start fresh.')
if (!useSampleData) {
  clearSavedData()
}

const app = document.querySelector<HTMLDivElement>('#app')!
let purchases = useSampleData ? createSamplePurchases() : loadPurchases()
let settings = loadSettings()
let currentPage: Page = 'dashboard'
let editingPurchaseId: string | null = null
let viewingPurchaseId: string | null = null
let chartReturnRate = 8
let selectedChartPurchaseIds = purchases
  .filter((purchase) => getRemainingInstallments(purchase) > 0)
  .map((purchase) => purchase.id)

function render(): void {
  app.innerHTML = renderApp({
    purchases,
    settings,
    currentPage,
    editingPurchaseId,
    viewingPurchaseId,
    chartReturnRate,
    selectedChartPurchaseIds,
  })
}

function showPage(page: Page): void {
  currentPage = page
  if (page !== 'form') editingPurchaseId = null
  render()
}

function startNewPurchase(): void {
  editingPurchaseId = null
  currentPage = 'form'
  render()
}

function handlePurchaseForm(form: HTMLFormElement): void {
  const values = new FormData(form)
  const existingPurchase = purchases.find((purchase) => purchase.id === editingPurchaseId)
  const details = {
    id: existingPurchase?.id ?? crypto.randomUUID(),
    name: String(values.get('name')).trim(),
    totalPrice: Number(values.get('totalPrice')),
    installmentCount: Number(values.get('installmentCount')),
    purchaseDate: String(values.get('purchaseDate')),
    firstPaymentDate: String(values.get('firstPaymentDate')) || undefined,
    paymentIntervalValue: Number(values.get('paymentIntervalValue')),
    paymentIntervalUnit: String(values.get('paymentIntervalUnit')) as Purchase['paymentIntervalUnit'],
    createdAt: existingPurchase?.createdAt ?? new Date().toISOString(),
  }
  const scheduleFields = ['totalPrice', 'installmentCount', 'purchaseDate', 'firstPaymentDate', 'paymentIntervalValue', 'paymentIntervalUnit'] as const
  const scheduleChanged = !existingPurchase || scheduleFields.some((field) => details[field] !== existingPurchase[field])
  const purchase: Purchase = {
    ...details,
    payments: scheduleChanged ? createPaymentSchedule(details) : existingPurchase!.payments,
  }

  purchases = existingPurchase
    ? purchases.map((item) => item.id === purchase.id ? purchase : item)
    : [...purchases, purchase]
  savePurchases(purchases)
  editingPurchaseId = null
  viewingPurchaseId = purchase.id
  currentPage = 'detail'
  render()
}

function handlePaymentManagement(form: HTMLFormElement): void {
  const purchase = purchases.find((item) => item.id === viewingPurchaseId)
  if (!purchase) return

  const values = new FormData(form)
  const payments = purchase.payments.map((payment) => ({
    installmentNumber: payment.installmentNumber,
    dueDate: String(values.get(`dueDate-${payment.installmentNumber}`)),
    amount: Number(values.get(`amount-${payment.installmentNumber}`)),
    status: String(values.get(`status-${payment.installmentNumber}`)) as PaymentStatus,
  }))

  purchases = purchases.map((item) => item.id === purchase.id ? { ...purchase, payments } : item)
  savePurchases(purchases)
  currentPage = 'detail'
  render()
}

app.addEventListener('click', (event) => {
  const target = event.target as HTMLElement
  const page = target.dataset.page as Page | undefined
  const action = target.dataset.action
  const id = target.dataset.id

  if (page) showPage(page)
  if (action === 'new-purchase') startNewPurchase()
  if (action === 'chart-rate' && target.dataset.rate) { chartReturnRate = Number(target.dataset.rate); render() }
  if (action === 'toggle-chart-purchase' && id) {
    selectedChartPurchaseIds = selectedChartPurchaseIds.includes(id)
      ? selectedChartPurchaseIds.filter((purchaseId) => purchaseId !== id)
      : [...selectedChartPurchaseIds, id]
    render()
  }
  if (action === 'mark-paid' && id && target.dataset.installment) {
    const installmentNumber = Number(target.dataset.installment)
    purchases = purchases.map((purchase) => purchase.id === id ? {
      ...purchase,
      payments: purchase.payments.map((payment) => payment.installmentNumber === installmentNumber ? { ...payment, status: 'paid' } : payment),
    } : purchase)
    savePurchases(purchases)
    render()
  }
  if (action === 'view' && id) { viewingPurchaseId = id; currentPage = 'detail'; render() }
  if (action === 'edit' && id) { editingPurchaseId = id; currentPage = 'form'; render() }
  if (action === 'manage-payments' && id) { viewingPurchaseId = id; currentPage = 'managePayments'; render() }
  if (action === 'delete' && id && confirm('Delete this purchase?')) {
    purchases = purchases.filter((purchase) => purchase.id !== id)
    savePurchases(purchases)
    render()
  }
})

app.addEventListener('submit', (event) => {
  event.preventDefault()
  const form = event.target as HTMLFormElement

  if (form.id === 'purchase-form') handlePurchaseForm(form)
  if (form.id === 'payment-management-form') handlePaymentManagement(form)
  if (form.id === 'settings-form') {
    const values = new FormData(form)
    settings = { currency: String(values.get('currency')) }
    saveSettings(settings)
    currentPage = 'dashboard'
    render()
  }
})

render()
