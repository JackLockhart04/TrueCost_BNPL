import './style.css'
import {
  createPaymentSchedule,
  formatDate,
  formatMoney,
  formatMonth,
  getAveragePaymentAmount,
  getOpportunityValue,
  getPaymentsForMonth,
  getRemainingBalance,
  getRemainingInstallments,
  getScheduledPayments,
  getToday,
  getUpcomingPayments,
} from './calculations'
import { clearSavedData, loadPurchases, loadSettings, savePurchases, saveSettings } from './storage'
import type { PaymentStatus, Purchase, Settings } from './types'

type Page = 'dashboard' | 'purchases' | 'form' | 'detail' | 'managePayments' | 'settings'

if (window.confirm('Clear all saved TrueCost BNPL data for this refresh?')) {
  clearSavedData()
}

const app = document.querySelector<HTMLDivElement>('#app')!
let purchases = loadPurchases()
let settings = loadSettings()
let currentPage: Page = 'dashboard'
let editingPurchaseId: string | null = null
let viewingPurchaseId: string | null = null

function escapeHtml(value: string): string {
  const element = document.createElement('span')
  element.textContent = value
  return element.innerHTML
}

function getViewedPurchase(): Purchase | undefined {
  return purchases.find((purchase) => purchase.id === viewingPurchaseId)
}

function render(): void {
  app.innerHTML = `
    <header class="site-header">
      <button class="brand" data-page="dashboard">TrueCost BNPL</button>
      <nav aria-label="Main navigation">
        <button data-page="dashboard">Dashboard</button>
        <button data-page="purchases">Purchases</button>
        <button data-action="new-purchase">Add purchase</button>
        <button data-page="settings">Settings</button>
      </nav>
    </header>
    <main class="page-content">${renderPage()}</main>
  `
}

function renderPage(): string {
  if (currentPage === 'purchases') return renderPurchases()
  if (currentPage === 'form') return renderPurchaseForm()
  if (currentPage === 'detail') return renderPurchaseDetail()
  if (currentPage === 'managePayments') return renderPaymentManagement()
  if (currentPage === 'settings') return renderSettings()
  return renderDashboard()
}

function renderDashboard(): string {
  const activePurchases = purchases.filter((purchase) => getRemainingInstallments(purchase) > 0)
  const remainingBalance = activePurchases.reduce((total, purchase) => total + getRemainingBalance(purchase), 0)
  const averagePayments = activePurchases.reduce((total, purchase) => total + getAveragePaymentAmount(purchase), 0)
  const tenYearValue = activePurchases.reduce((total, purchase) => total + getOpportunityValue(purchase, 10), 0)
  const thisMonthsPayments = getPaymentsForMonth(purchases)
  const dueThisMonth = thisMonthsPayments
    .filter((payment) => payment.status === 'scheduled')
    .reduce((total, payment) => total + payment.amount, 0)

  return `
    <section class="hero"><p class="eyebrow">Your BNPL purchases, in future dollars</p><h1>See the opportunity cost.</h1><p>Track purchases and estimate what their remaining payments could become if invested instead.</p><button class="primary-button" data-action="new-purchase">Add a purchase</button></section>
    <section class="summary-grid" aria-label="Purchase summary">
      ${summaryCard('Active purchases', String(activePurchases.length))}
      ${summaryCard('Remaining balance', formatMoney(remainingBalance, settings.currency))}
      ${summaryCard('Typical payment amount', formatMoney(averagePayments, settings.currency))}
      ${summaryCard('Payments due this month', formatMoney(dueThisMonth, settings.currency))}
      ${summaryCard('Potential value in 10 years', formatMoney(tenYearValue, settings.currency))}
    </section>
    ${renderUpcomingTimeline()}
    ${renderPaymentCalendar(thisMonthsPayments)}
    <section class="panel explanation"><h2>How the estimate works</h2><p>For each unpaid payment, TrueCost estimates its future value using that purchase's annual return rate. This is an educational estimate, not investment advice.</p></section>
  `
}

function summaryCard(label: string, value: string): string {
  return `<article class="summary-card"><p>${label}</p><strong>${value}</strong></article>`
}

function renderUpcomingTimeline(): string {
  const payments = getUpcomingPayments(purchases)
  const rows = payments.length === 0 ? '<p>No upcoming scheduled payments.</p>' : payments.map((payment) => `
    <li><div><strong>${escapeHtml(payment.purchase.name)}</strong><span>${formatDate(payment.date)}</span></div><strong>${formatMoney(payment.amount, settings.currency)}</strong></li>
  `).join('')
  return `<section class="panel timeline"><div class="section-heading"><div><h2>Next 5 payments</h2><p>Your next scheduled unpaid installments.</p></div><button data-page="purchases">View purchases</button></div><ol>${rows}</ol></section>`
}

function renderPaymentCalendar(payments: ReturnType<typeof getPaymentsForMonth>): string {
  const month = new Date()
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const firstDayOfWeek = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const blankDays = Array.from({ length: firstDayOfWeek }, () => '<div class="calendar-day empty"></div>').join('')
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    const entries = payments.filter((payment) => payment.date.getDate() === day).map((payment) => `
      <span class="calendar-payment ${payment.status}" title="${escapeHtml(payment.purchase.name)}: ${formatMoney(payment.amount, settings.currency)}">${escapeHtml(payment.purchase.name)} ${formatMoney(payment.amount, settings.currency)}</span>
    `).join('')
    return `<div class="calendar-day"><strong>${day}</strong>${entries}</div>`
  }).join('')
  return `<section class="panel calendar-section"><div class="section-heading"><div><h2>Payments due this month</h2><p>${formatMonth(month)}. Green is paid, blue is scheduled, and red is missed.</p></div></div><div class="calendar-weekdays"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div class="calendar-grid">${blankDays}${days}</div></section>`
}

function renderPurchases(): string {
  if (purchases.length === 0) return `<section class="empty-state"><h1>No purchases yet</h1><p>Add a purchase to begin exploring its opportunity cost.</p><button class="primary-button" data-action="new-purchase">Add a purchase</button></section>`
  const rows = purchases.map((purchase) => `
    <article class="purchase-card"><div><h2>${escapeHtml(purchase.name)}</h2><p>${getRemainingInstallments(purchase)} of ${purchase.installmentCount} payments not paid - every ${purchase.paymentIntervalValue} ${purchase.paymentIntervalUnit}</p></div><div class="purchase-numbers"><strong>${formatMoney(getRemainingBalance(purchase), settings.currency)}</strong><span>remaining balance</span></div><div class="card-actions"><button class="primary-button" data-action="view" data-id="${purchase.id}">View</button><button data-action="edit" data-id="${purchase.id}">Edit</button><button class="danger-button" data-action="delete" data-id="${purchase.id}">Delete</button></div></article>
  `).join('')
  return `<section><div class="page-heading"><div><h1>Purchases</h1><p>All purchases are stored only in this browser.</p></div><button class="primary-button" data-action="new-purchase">Add a purchase</button></div><div class="purchase-list">${rows}</div></section>`
}

function renderPurchaseDetail(): string {
  const purchase = getViewedPurchase()
  if (!purchase) return `<section class="empty-state"><h1>Purchase not found</h1><button class="primary-button" data-page="purchases">Back to purchases</button></section>`
  const nextPayments = getUpcomingPayments([purchase], 3)
  const paymentRows = nextPayments.length === 0 ? '<li>No scheduled payments remain.</li>' : nextPayments.map((payment) => `<li><span>${formatDate(payment.date)}</span><strong>${formatMoney(payment.amount, settings.currency)}</strong></li>`).join('')
  return `
    <section class="detail-page"><button class="back-button" data-page="purchases">Back to purchases</button><div class="page-heading"><div><p class="eyebrow">Purchase details</p><h1>${escapeHtml(purchase.name)}</h1></div><div class="card-actions"><button data-action="edit" data-id="${purchase.id}">Edit purchase</button><button class="primary-button" data-action="manage-payments" data-id="${purchase.id}">Manage payments</button></div></div>
      <section class="summary-grid detail-summary">${summaryCard('Original price', formatMoney(purchase.totalPrice, settings.currency))}${summaryCard('Remaining balance', formatMoney(getRemainingBalance(purchase), settings.currency))}${summaryCard('Payment interval', `${purchase.paymentIntervalValue} ${purchase.paymentIntervalUnit}`)}${summaryCard('Return rate', `${purchase.annualReturnRate}%`)}</section>
      <section class="panel"><h2>Next 3 payment dates</h2><ol class="payment-list">${paymentRows}</ol></section>
    </section>
  `
}

function renderPaymentManagement(): string {
  const purchase = getViewedPurchase()
  if (!purchase) return `<section class="empty-state"><h1>Purchase not found</h1><button class="primary-button" data-page="purchases">Back to purchases</button></section>`
  const rows = purchase.payments.map((payment) => `
    <tr><td>${payment.installmentNumber}</td><td><input name="dueDate-${payment.installmentNumber}" type="date" required value="${payment.dueDate}" /></td><td><input name="amount-${payment.installmentNumber}" type="number" min="0" step="0.01" required value="${payment.amount}" /></td><td><select name="status-${payment.installmentNumber}">${statusOptions(payment.status)}</select></td></tr>
  `).join('')
  return `<section class="form-section wide-form"><button class="back-button" data-action="view" data-id="${purchase.id}">Back to purchase</button><h1>Manage payments</h1><p>Update a payment's due date, amount, or status. These changes do not edit the original purchase details.</p><form id="payment-management-form" class="panel"><div class="payment-table-wrap"><table><thead><tr><th>Payment</th><th>Due date</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><div class="form-actions"><button class="primary-button" type="submit">Save payment changes</button></div></form></section>`
}

function statusOptions(selectedStatus: PaymentStatus): string {
  return (['scheduled', 'paid', 'missed'] as PaymentStatus[]).map((status) => `<option value="${status}" ${status === selectedStatus ? 'selected' : ''}>${status[0].toUpperCase()}${status.slice(1)}</option>`).join('')
}

function renderPurchaseForm(): string {
  const purchase = purchases.find((item) => item.id === editingPurchaseId)
  const isEditing = Boolean(purchase)
  const data = purchase ?? { name: '', totalPrice: '', installmentCount: '', purchaseDate: getToday(), firstPaymentDate: '', paymentIntervalValue: 1, paymentIntervalUnit: 'months', annualReturnRate: settings.defaultAnnualReturnRate }
  return `
    <section class="form-section"><h1>${isEditing ? 'Edit purchase' : 'Add a purchase'}</h1><p>Enter the basic purchase details. Payment records are managed separately after saving.</p><form id="purchase-form" class="panel form-grid">
      <label>Purchase name<input name="name" required value="${escapeHtml(String(data.name))}" placeholder="New laptop" /></label>
      <label>Total purchase price<input name="totalPrice" type="number" min="0.01" step="0.01" required value="${data.totalPrice}" /></label>
      <label>Number of installments<input name="installmentCount" type="number" min="1" step="1" required value="${data.installmentCount}" /></label>
      <label>Purchase date<input name="purchaseDate" type="date" required value="${data.purchaseDate}" /></label>
      <label>First payment date <span class="optional">(optional)</span><input name="firstPaymentDate" type="date" value="${data.firstPaymentDate ?? ''}" /></label>
      <div class="interval-fields"><label>Time per payment<input name="paymentIntervalValue" type="number" min="1" step="1" required value="${data.paymentIntervalValue}" /></label><label>Unit<select name="paymentIntervalUnit"><option value="days" ${data.paymentIntervalUnit === 'days' ? 'selected' : ''}>Days</option><option value="weeks" ${data.paymentIntervalUnit === 'weeks' ? 'selected' : ''}>Weeks</option><option value="months" ${data.paymentIntervalUnit === 'months' ? 'selected' : ''}>Months</option></select></label></div>
      <label>Estimated annual return (%)<input name="annualReturnRate" type="number" min="0" step="0.1" required value="${data.annualReturnRate}" /></label>
      <p class="form-note">If you leave the first payment date blank, it is set to the purchase date plus the time per payment. Changing schedule details while editing recreates that purchase's payment records.</p>
      <div class="form-actions"><button class="primary-button" type="submit">${isEditing ? 'Save changes' : 'Create purchase'}</button><button type="button" data-page="purchases">Cancel</button></div>
    </form></section>
  `
}

function renderSettings(): string {
  return `<section class="form-section"><h1>Settings</h1><p>These defaults apply when you add a new purchase.</p><form id="settings-form" class="panel form-grid"><label>Default annual return (%)<input name="defaultAnnualReturnRate" type="number" min="0" step="0.1" required value="${settings.defaultAnnualReturnRate}" /></label><label>Currency<select name="currency"><option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>USD ($)</option><option value="CAD" ${settings.currency === 'CAD' ? 'selected' : ''}>CAD ($)</option><option value="EUR" ${settings.currency === 'EUR' ? 'selected' : ''}>EUR</option></select></label><div class="form-actions"><button class="primary-button" type="submit">Save settings</button></div></form></section>`
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
    annualReturnRate: Number(values.get('annualReturnRate')),
    createdAt: existingPurchase?.createdAt ?? new Date().toISOString(),
  }
  const scheduleChanged = !existingPurchase || ['totalPrice', 'installmentCount', 'purchaseDate', 'firstPaymentDate', 'paymentIntervalValue', 'paymentIntervalUnit'].some((key) => details[key as keyof typeof details] !== existingPurchase[key as keyof Purchase])
  const purchase: Purchase = { ...details, payments: scheduleChanged ? createPaymentSchedule(details) : existingPurchase!.payments }
  purchases = existingPurchase ? purchases.map((item) => item.id === purchase.id ? purchase : item) : [...purchases, purchase]
  savePurchases(purchases)
  editingPurchaseId = null
  viewingPurchaseId = purchase.id
  currentPage = 'detail'
  render()
}

function handlePaymentManagement(form: HTMLFormElement): void {
  const purchase = getViewedPurchase()
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
  if (action === 'view' && id) { viewingPurchaseId = id; currentPage = 'detail'; render() }
  if (action === 'edit' && id) { editingPurchaseId = id; currentPage = 'form'; render() }
  if (action === 'manage-payments' && id) { viewingPurchaseId = id; currentPage = 'managePayments'; render() }
  if (action === 'delete' && id && confirm('Delete this purchase?')) { purchases = purchases.filter((purchase) => purchase.id !== id); savePurchases(purchases); render() }
})

app.addEventListener('submit', (event) => {
  event.preventDefault()
  const form = event.target as HTMLFormElement
  if (form.id === 'purchase-form') handlePurchaseForm(form)
  if (form.id === 'payment-management-form') handlePaymentManagement(form)
  if (form.id === 'settings-form') {
    const values = new FormData(form)
    settings = { defaultAnnualReturnRate: Number(values.get('defaultAnnualReturnRate')), currency: String(values.get('currency')) }
    saveSettings(settings)
    currentPage = 'dashboard'
    render()
  }
})

render()
