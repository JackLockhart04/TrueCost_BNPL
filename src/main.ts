import './style.css'
import {
  formatMoney,
  getInstallmentAmount,
  getOpportunityValue,
  getRemainingBalance,
  getRemainingInstallments,
} from './calculations'
import { loadPurchases, loadSettings, savePurchases, saveSettings } from './storage'
import type { Purchase, Settings } from './types'

type Page = 'dashboard' | 'purchases' | 'form' | 'settings'

const app = document.querySelector<HTMLDivElement>('#app')!
let purchases = loadPurchases()
let settings = loadSettings()
let currentPage: Page = 'dashboard'
let editingPurchaseId: string | null = null

function escapeHtml(value: string): string {
  const element = document.createElement('span')
  element.textContent = value
  return element.innerHTML
}

function render(): void {
  app.innerHTML = `
    <header class="site-header">
      <a class="brand" href="#dashboard">TrueCost BNPL</a>
      <nav aria-label="Main navigation">
        <button data-page="dashboard">Dashboard</button>
        <button data-page="purchases">Purchases</button>
        <button data-page="form">Add purchase</button>
        <button data-page="settings">Settings</button>
      </nav>
    </header>
    <main class="page-content">${renderPage()}</main>
  `
}

function renderPage(): string {
  switch (currentPage) {
    case 'purchases':
      return renderPurchases()
    case 'form':
      return renderPurchaseForm()
    case 'settings':
      return renderSettings()
    default:
      return renderDashboard()
  }
}

function renderDashboard(): string {
  const activePurchases = purchases.filter((purchase) => getRemainingInstallments(purchase) > 0)
  const remainingBalance = activePurchases.reduce((total, purchase) => total + getRemainingBalance(purchase), 0)
  const monthlyPayments = activePurchases.reduce(
    (total, purchase) => total + getInstallmentAmount(purchase),
    0,
  )
  const tenYearValue = activePurchases.reduce(
    (total, purchase) => total + getOpportunityValue(purchase, 10),
    0,
  )

  return `
    <section class="hero">
      <p class="eyebrow">Your BNPL purchases, in future dollars</p>
      <h1>See the opportunity cost.</h1>
      <p>Track purchases and estimate what their remaining payments could become if invested instead.</p>
      <button class="primary-button" data-page="form">Add a purchase</button>
    </section>
    <section class="summary-grid" aria-label="Purchase summary">
      ${summaryCard('Active purchases', String(activePurchases.length))}
      ${summaryCard('Remaining balance', formatMoney(remainingBalance, settings.currency))}
      ${summaryCard('Monthly payments', formatMoney(monthlyPayments, settings.currency))}
      ${summaryCard('Potential value in 10 years', formatMoney(tenYearValue, settings.currency))}
    </section>
    <section class="panel explanation">
      <h2>How the estimate works</h2>
      <p>For each remaining monthly payment, TrueCost estimates its future value using that purchase’s annual return rate. This is an educational estimate, not investment advice.</p>
    </section>
  `
}

function summaryCard(label: string, value: string): string {
  return `<article class="summary-card"><p>${label}</p><strong>${value}</strong></article>`
}

function renderPurchases(): string {
  if (purchases.length === 0) {
    return `
      <section class="empty-state">
        <h1>No purchases yet</h1>
        <p>Add a purchase to begin exploring its opportunity cost.</p>
        <button class="primary-button" data-page="form">Add a purchase</button>
      </section>
    `
  }

  const purchaseRows = purchases.map((purchase) => `
    <article class="purchase-card">
      <div>
        <h2>${escapeHtml(purchase.name)}</h2>
        <p>${getRemainingInstallments(purchase)} of ${purchase.installmentCount} installments remaining</p>
      </div>
      <div class="purchase-numbers">
        <strong>${formatMoney(getRemainingBalance(purchase), settings.currency)}</strong>
        <span>remaining balance</span>
      </div>
      <div class="card-actions">
        <button data-action="edit" data-id="${purchase.id}">Edit</button>
        <button class="danger-button" data-action="delete" data-id="${purchase.id}">Delete</button>
      </div>
      ${renderOpportunityTable(purchase)}
    </article>
  `).join('')

  return `<section><div class="page-heading"><div><h1>Purchases</h1><p>All purchases are stored only in this browser.</p></div><button class="primary-button" data-page="form">Add a purchase</button></div><div class="purchase-list">${purchaseRows}</div></section>`
}

function renderOpportunityTable(purchase: Purchase): string {
  const values = [1, 5, 10].map((years) => `<div><span>${years} year${years === 1 ? '' : 's'}</span><strong>${formatMoney(getOpportunityValue(purchase, years), settings.currency)}</strong></div>`).join('')
  return `<div class="opportunity-values"><p>Estimated value if remaining payments were invested at ${purchase.annualReturnRate}%</p><div>${values}</div></div>`
}

function renderPurchaseForm(): string {
  const purchase = purchases.find((item) => item.id === editingPurchaseId)
  const isEditing = Boolean(purchase)
  const data = purchase ?? {
    name: '', totalPrice: '', installmentCount: '', installmentsPaid: 0,
    annualReturnRate: settings.defaultAnnualReturnRate,
  }

  return `
    <section class="form-section">
      <h1>${isEditing ? 'Edit purchase' : 'Add a purchase'}</h1>
      <p>Enter the basic details. You can change anything later.</p>
      <form id="purchase-form" class="panel form-grid">
        <label>Purchase name<input name="name" required value="${escapeHtml(String(data.name))}" placeholder="New laptop" /></label>
        <label>Total purchase price<input name="totalPrice" type="number" min="0.01" step="0.01" required value="${data.totalPrice}" /></label>
        <label>Number of installments<input name="installmentCount" type="number" min="1" step="1" required value="${data.installmentCount}" /></label>
        <label>Installments already paid<input name="installmentsPaid" type="number" min="0" step="1" required value="${data.installmentsPaid}" /></label>
        <label>Estimated annual return (%)<input name="annualReturnRate" type="number" min="0" step="0.1" required value="${data.annualReturnRate}" /></label>
        <p class="form-note">Payments are treated as monthly for this proof of concept.</p>
        <div class="form-actions"><button class="primary-button" type="submit">${isEditing ? 'Save changes' : 'Save purchase'}</button><button type="button" data-page="purchases">Cancel</button></div>
      </form>
    </section>
  `
}

function renderSettings(): string {
  return `
    <section class="form-section">
      <h1>Settings</h1>
      <p>These defaults apply when you add a new purchase.</p>
      <form id="settings-form" class="panel form-grid">
        <label>Default annual return (%)<input name="defaultAnnualReturnRate" type="number" min="0" step="0.1" required value="${settings.defaultAnnualReturnRate}" /></label>
        <label>Currency<select name="currency"><option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>USD ($)</option><option value="CAD" ${settings.currency === 'CAD' ? 'selected' : ''}>CAD ($)</option><option value="EUR" ${settings.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option></select></label>
        <div class="form-actions"><button class="primary-button" type="submit">Save settings</button></div>
      </form>
    </section>
  `
}

function showPage(page: Page): void {
  currentPage = page
  if (page !== 'form') editingPurchaseId = null
  render()
}

function handlePurchaseForm(form: HTMLFormElement): void {
  const values = new FormData(form)
  const installmentCount = Number(values.get('installmentCount'))
  const installmentsPaid = Number(values.get('installmentsPaid'))

  if (installmentsPaid > installmentCount) {
    alert('Installments paid cannot be greater than the total installment count.')
    return
  }

  const purchase: Purchase = {
    id: editingPurchaseId ?? crypto.randomUUID(),
    name: String(values.get('name')).trim(),
    totalPrice: Number(values.get('totalPrice')),
    installmentCount,
    installmentsPaid,
    paymentFrequency: 'monthly',
    annualReturnRate: Number(values.get('annualReturnRate')),
    createdAt: purchases.find((item) => item.id === editingPurchaseId)?.createdAt ?? new Date().toISOString(),
  }

  purchases = editingPurchaseId
    ? purchases.map((item) => item.id === editingPurchaseId ? purchase : item)
    : [...purchases, purchase]
  savePurchases(purchases)
  editingPurchaseId = null
  currentPage = 'purchases'
  render()
}

app.addEventListener('click', (event) => {
  const target = event.target as HTMLElement
  const page = target.dataset.page as Page | undefined
  const action = target.dataset.action
  const id = target.dataset.id

  if (page) showPage(page)
  if (action === 'edit' && id) {
    editingPurchaseId = id
    currentPage = 'form'
    render()
  }
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
  if (form.id === 'settings-form') {
    const values = new FormData(form)
    settings = {
      defaultAnnualReturnRate: Number(values.get('defaultAnnualReturnRate')),
      currency: String(values.get('currency')),
    }
    saveSettings(settings)
    currentPage = 'dashboard'
    render()
  }
})

render()
