import {
  formatDate,
  formatMoney,
  formatMonth,
  getOpportunityValue,
  getPortfolioOpportunityValue,
  getPaymentsForMonth,
  getRemainingBalance,
  getRemainingInstallments,
  getToday,
  getUpcomingPayments,
} from './calculations'
import type { PaymentStatus, Purchase, Settings } from './types'

export type Page = 'dashboard' | 'purchases' | 'form' | 'detail' | 'managePayments' | 'settings'

type AppView = {
  purchases: Purchase[]
  settings: Settings
  currentPage: Page
  editingPurchaseId: string | null
  viewingPurchaseId: string | null
  chartReturnRate: number
}

function escapeHtml(value: string): string {
  const element = document.createElement('span')
  element.textContent = value
  return element.innerHTML
}

export function renderApp(view: AppView): string {
  return `
    <header class="site-header">
      <button class="brand" data-page="dashboard">TrueCost BNPL</button>
      <nav aria-label="Main navigation">
        <button data-page="dashboard">Dashboard</button>
        <button data-page="purchases">Purchases</button>
        <button data-action="new-purchase">Add purchase</button>
        <button data-page="settings">Settings</button>
      </nav>
    </header>
    <main class="page-content">${renderCurrentPage(view)}</main>
  `
}

function renderCurrentPage(view: AppView): string {
  if (view.currentPage === 'purchases') return renderPurchases(view)
  if (view.currentPage === 'form') return renderPurchaseForm(view)
  if (view.currentPage === 'detail') return renderPurchaseDetail(view)
  if (view.currentPage === 'managePayments') return renderPaymentManagement(view)
  if (view.currentPage === 'settings') return renderSettings(view)
  return renderDashboard(view)
}

function summaryCard(label: string, value: string): string {
  return `<article class="summary-card"><p>${label}</p><strong>${value}</strong></article>`
}

function renderDashboard({ purchases, settings, chartReturnRate }: AppView): string {
  const activePurchases = purchases.filter((purchase) => getRemainingInstallments(purchase) > 0)
  const remainingBalance = activePurchases.reduce((total, purchase) => total + getRemainingBalance(purchase), 0)
  const tenYearValue = getPortfolioOpportunityValue(activePurchases, 10, 8)
  const thisMonthsPayments = getPaymentsForMonth(purchases)
  const dueThisMonth = thisMonthsPayments.filter((payment) => payment.status === 'scheduled').reduce((total, payment) => total + payment.amount, 0)

  return `
    <section class="hero"><p class="eyebrow">Your BNPL purchases, in future dollars</p><h1>See the opportunity cost.</h1><p>Track purchases and estimate what their remaining payments could become if invested instead.</p><button class="primary-button" data-action="new-purchase">Add a purchase</button></section>
    <section class="summary-grid" aria-label="Purchase summary">
      ${summaryCard('Active purchases', String(activePurchases.length))}
      ${summaryCard('Remaining balance', formatMoney(remainingBalance, settings.currency))}
      ${summaryCard('Payments due this month', formatMoney(dueThisMonth, settings.currency))}
      ${summaryCard('Potential value in 10 years', formatMoney(tenYearValue, settings.currency))}
    </section>
    ${renderUpcomingTimeline(purchases, settings)}
    ${renderPaymentCalendar(thisMonthsPayments, settings)}
    ${renderInvestmentChart(activePurchases, settings, chartReturnRate)}
    <section class="panel explanation"><h2>How the estimate works</h2><p>For each unpaid payment, TrueCost estimates its future value using that purchase's annual return rate. This is an educational estimate, not investment advice.</p></section>
  `
}

function renderInvestmentChart(purchases: Purchase[], settings: Settings, returnRate: number): string {
  const chartWidth = 720
  const chartHeight = 300
  const padding = { top: 28, right: 24, bottom: 45, left: 74 }
  const values = Array.from({ length: 11 }, (_, year) => getPortfolioOpportunityValue(purchases, year, returnRate))
  const maxValue = Math.max(...values, 1)
  const x = (year: number) => padding.left + (year / 10) * (chartWidth - padding.left - padding.right)
  const y = (value: number) => chartHeight - padding.bottom - (value / maxValue) * (chartHeight - padding.top - padding.bottom)
  const linePoints = values.map((value, year) => `${x(year)},${y(value)}`).join(' ')
  const yTicks = [0, maxValue / 2, maxValue]
  const yLabels = yTicks.map((value) => `<text x="${padding.left - 10}" y="${y(value) + 4}" text-anchor="end">${formatMoney(value, settings.currency)}</text>`).join('')
  const xLabels = [0, 5, 10].map((year) => `<text x="${x(year)}" y="${chartHeight - 16}" text-anchor="middle">${year} years</text>`).join('')
  const markerYears = [1, 5, 10]
  const markers = markerYears.map((year) => `<circle cx="${x(year)}" cy="${y(values[year])}" r="4" /><text x="${x(year)}" y="${y(values[year]) - 10}" text-anchor="middle">${formatMoney(values[year], settings.currency)}</text>`).join('')

  return `
    <section class="panel investment-chart">
      <div class="section-heading"><div><h2>What your BNPL payments could become</h2><p>Estimated value of investing every unpaid payment instead of spending it.</p></div></div>
      <div class="chart-controls" aria-label="Investment comparison rate">
        <button data-action="chart-rate" data-rate="4" class="${returnRate === 4 ? 'selected' : ''}">4% - High-yield savings</button>
        <button data-action="chart-rate" data-rate="8" class="${returnRate === 8 ? 'selected' : ''}">8% - S&P 500</button>
      </div>
      <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="Estimated investment value over ten years at ${returnRate} percent">
        <line x1="${padding.left}" y1="${y(0)}" x2="${chartWidth - padding.right}" y2="${y(0)}" class="chart-axis" />
        ${yTicks.slice(1).map((value) => `<line x1="${padding.left}" y1="${y(value)}" x2="${chartWidth - padding.right}" y2="${y(value)}" class="chart-grid" />`).join('')}
        ${yLabels}${xLabels}
        <polyline points="${linePoints}" class="chart-line" />
        ${markers}
        <text x="${padding.left}" y="16" class="chart-label">Estimated invested value</text>
        <text x="${chartWidth - padding.right}" y="${y(0) - 8}" text-anchor="end" class="chart-baseline">BNPL purchase: $0 invested</text>
      </svg>
      <p class="chart-note">This illustration uses a ${returnRate}% annual return assumption. Actual investment returns can vary.</p>
    </section>
  `
}

function renderUpcomingTimeline(purchases: Purchase[], settings: Settings): string {
  const payments = getUpcomingPayments(purchases)
  const rows = payments.length === 0 ? '<p>No upcoming scheduled payments.</p>' : payments.map((payment) => `
    <li><div><strong>${escapeHtml(payment.purchase.name)}</strong><span>${formatDate(payment.date)}</span></div><strong>${formatMoney(payment.amount, settings.currency)}</strong></li>
  `).join('')
  return `<section class="panel timeline"><div class="section-heading"><div><h2>Next 5 payments</h2><p>Your next scheduled unpaid installments.</p></div><button data-page="purchases">View purchases</button></div><ol>${rows}</ol></section>`
}

function renderPaymentCalendar(payments: ReturnType<typeof getPaymentsForMonth>, settings: Settings): string {
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

function renderPurchases({ purchases, settings }: AppView): string {
  if (purchases.length === 0) return `<section class="empty-state"><h1>No purchases yet</h1><p>Add a purchase to begin exploring its opportunity cost.</p><button class="primary-button" data-action="new-purchase">Add a purchase</button></section>`
  const rows = purchases.map((purchase) => `
    <article class="purchase-card"><div><h2>${escapeHtml(purchase.name)}</h2><p>${getRemainingInstallments(purchase)} of ${purchase.installmentCount} payments not paid - every ${purchase.paymentIntervalValue} ${purchase.paymentIntervalUnit}</p></div><div class="purchase-numbers"><strong>${formatMoney(getRemainingBalance(purchase), settings.currency)}</strong><span>remaining balance</span></div><div class="card-actions"><button class="primary-button" data-action="view" data-id="${purchase.id}">View</button><button data-action="edit" data-id="${purchase.id}">Edit</button><button class="danger-button" data-action="delete" data-id="${purchase.id}">Delete</button></div></article>
  `).join('')
  return `<section><div class="page-heading"><div><h1>Purchases</h1><p>All purchases are stored only in this browser.</p></div><button class="primary-button" data-action="new-purchase">Add a purchase</button></div><div class="purchase-list">${rows}</div></section>`
}

function renderPurchaseDetail(view: AppView): string {
  const purchase = view.purchases.find((item) => item.id === view.viewingPurchaseId)
  if (!purchase) return missingPurchase()
  const nextPayments = getUpcomingPayments([purchase], 3)
  const paymentRows = nextPayments.length === 0 ? '<li>No scheduled payments remain.</li>' : nextPayments.map((payment) => `<li><span>${formatDate(payment.date)}</span><strong>${formatMoney(payment.amount, view.settings.currency)}</strong></li>`).join('')
  const opportunityValues = [1, 5, 10].map((years) => summaryCard(`${years}-year value at 8%`, formatMoney(getOpportunityValue(purchase, years), view.settings.currency))).join('')
  return `<section class="detail-page"><button class="back-button" data-page="purchases">Back to purchases</button><div class="page-heading"><div><p class="eyebrow">Purchase details</p><h1>${escapeHtml(purchase.name)}</h1></div><div class="card-actions"><button data-action="edit" data-id="${purchase.id}">Edit purchase</button><button class="primary-button" data-action="manage-payments" data-id="${purchase.id}">Manage payments</button></div></div><section class="summary-grid detail-summary">${summaryCard('Original price', formatMoney(purchase.totalPrice, view.settings.currency))}${summaryCard('Remaining balance', formatMoney(getRemainingBalance(purchase), view.settings.currency))}${summaryCard('Payment interval', `${purchase.paymentIntervalValue} ${purchase.paymentIntervalUnit}`)}</section><section class="panel"><h2>Potential value of these payments</h2><p>Assumes an 8% annual return, using the S&P 500 as an educational benchmark.</p><div class="summary-grid detail-summary">${opportunityValues}</div></section><section class="panel"><h2>Next 3 payment dates</h2><ol class="payment-list">${paymentRows}</ol></section></section>`
}

function renderPaymentManagement(view: AppView): string {
  const purchase = view.purchases.find((item) => item.id === view.viewingPurchaseId)
  if (!purchase) return missingPurchase()
  const rows = purchase.payments.map((payment) => `<tr><td>${payment.installmentNumber}</td><td><input name="dueDate-${payment.installmentNumber}" type="date" required value="${payment.dueDate}" /></td><td><input name="amount-${payment.installmentNumber}" type="number" min="0" step="0.01" required value="${payment.amount}" /></td><td><select name="status-${payment.installmentNumber}">${statusOptions(payment.status)}</select></td></tr>`).join('')
  return `<section class="form-section wide-form"><button class="back-button" data-action="view" data-id="${purchase.id}">Back to purchase</button><h1>Manage payments</h1><p>Update a payment's due date, amount, or status. These changes do not edit the original purchase details.</p><form id="payment-management-form" class="panel"><div class="payment-table-wrap"><table><thead><tr><th>Payment</th><th>Due date</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><div class="form-actions"><button class="primary-button" type="submit">Save payment changes</button></div></form></section>`
}

function renderPurchaseForm(view: AppView): string {
  const purchase = view.purchases.find((item) => item.id === view.editingPurchaseId)
  const data = purchase ?? { name: '', totalPrice: '', installmentCount: '', purchaseDate: getToday(), firstPaymentDate: '', paymentIntervalValue: 1, paymentIntervalUnit: 'months' }
  return `<section class="form-section"><h1>${purchase ? 'Edit purchase' : 'Add a purchase'}</h1><p>Enter the basic purchase details. Payment records are managed separately after saving.</p><form id="purchase-form" class="panel form-grid"><label>Purchase name<input name="name" required value="${escapeHtml(String(data.name))}" placeholder="New laptop" /></label><label>Total purchase price<input name="totalPrice" type="number" min="0.01" step="0.01" required value="${data.totalPrice}" /></label><label>Number of installments<input name="installmentCount" type="number" min="1" step="1" required value="${data.installmentCount}" /></label><label>Purchase date<input name="purchaseDate" type="date" required value="${data.purchaseDate}" /></label><label>First payment date <span class="optional">(optional)</span><input name="firstPaymentDate" type="date" value="${data.firstPaymentDate ?? ''}" /></label><div class="interval-fields"><label>Time per payment<input name="paymentIntervalValue" type="number" min="1" step="1" required value="${data.paymentIntervalValue}" /></label><label>Unit<select name="paymentIntervalUnit"><option value="days" ${data.paymentIntervalUnit === 'days' ? 'selected' : ''}>Days</option><option value="weeks" ${data.paymentIntervalUnit === 'weeks' ? 'selected' : ''}>Weeks</option><option value="months" ${data.paymentIntervalUnit === 'months' ? 'selected' : ''}>Months</option></select></label></div><p class="form-note">If you leave the first payment date blank, it is set to the purchase date plus the time per payment. Changing schedule details while editing recreates that purchase's payment records.</p><div class="form-actions"><button class="primary-button" type="submit">${purchase ? 'Save changes' : 'Create purchase'}</button><button type="button" data-page="purchases">Cancel</button></div></form></section>`
}

function renderSettings({ settings }: AppView): string {
  return `<section class="form-section"><h1>Settings</h1><p>Choose how values are displayed.</p><form id="settings-form" class="panel form-grid"><label>Currency<select name="currency"><option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>USD ($)</option><option value="CAD" ${settings.currency === 'CAD' ? 'selected' : ''}>CAD ($)</option><option value="EUR" ${settings.currency === 'EUR' ? 'selected' : ''}>EUR</option></select></label><div class="form-actions"><button class="primary-button" type="submit">Save settings</button></div></form></section>`
}

function statusOptions(selectedStatus: PaymentStatus): string {
  return (['scheduled', 'paid', 'missed'] as PaymentStatus[]).map((status) => `<option value="${status}" ${status === selectedStatus ? 'selected' : ''}>${status[0].toUpperCase()}${status.slice(1)}</option>`).join('')
}

function missingPurchase(): string {
  return `<section class="empty-state"><h1>Purchase not found</h1><button class="primary-button" data-page="purchases">Back to purchases</button></section>`
}
