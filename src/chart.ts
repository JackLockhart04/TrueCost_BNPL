import { formatMoney, getPortfolioOpportunityValue, getRemainingInstallments } from './calculations'
import type { Purchase, Settings } from './types'

type InvestmentChartProps = {
  purchases: Purchase[]
  settings: Settings
  returnRate: number
  selectedPurchaseIds: string[]
}

export function renderInvestmentChart({ purchases, settings, returnRate, selectedPurchaseIds }: InvestmentChartProps): string {
  const activePurchases = purchases.filter((purchase) => getRemainingInstallments(purchase) > 0)
  const selectedPurchases = activePurchases.filter((purchase) => selectedPurchaseIds.includes(purchase.id))
  const selectionControls = activePurchases.map((purchase) => `
    <button data-action="toggle-chart-purchase" data-id="${purchase.id}" class="${selectedPurchaseIds.includes(purchase.id) ? 'selected' : ''}">${purchase.name}</button>
  `).join('')

  if (activePurchases.length === 0) {
    return `<section class="panel investment-chart empty-chart"><h2>What your BNPL payments could become</h2><p>Add a purchase with payments remaining to see an investment-growth illustration here.</p></section>`
  }

  const chart = selectedPurchases.length === 0
    ? '<p class="empty-chart-message">Select at least one purchase below to show its investment projection.</p>'
    : renderChartSvg(selectedPurchases, settings, returnRate)
  const tenYearValue = getPortfolioOpportunityValue(selectedPurchases, 10, returnRate)

  return `
    <section class="panel investment-chart">
      <div class="section-heading"><div><h2>What your BNPL payments could become</h2><p>Estimated value of investing every unpaid payment instead of spending it.</p></div></div>
      <div class="chart-controls" aria-label="Investment comparison rate">
        <button data-action="chart-rate" data-rate="4" class="${returnRate === 4 ? 'selected' : ''}">4% - High-yield savings</button>
        <button data-action="chart-rate" data-rate="8" class="${returnRate === 8 ? 'selected' : ''}">8% - S&P 500</button>
      </div>
      ${chart}
      <p class="chart-lesson">At ${returnRate}%, the selected payments could be worth <strong>${formatMoney(tenYearValue, settings.currency)}</strong> in 10 years. This estimate uses scheduled unpaid payments only; actual investment returns vary.</p>
      <div class="chart-purchase-controls"><span>Include in chart:</span>${selectionControls}</div>
    </section>
  `
}

function renderChartSvg(purchases: Purchase[], settings: Settings, returnRate: number): string {
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
  const markers = [1, 5, 10].map((year) => `<circle cx="${x(year)}" cy="${y(values[year])}" r="4" /><text x="${x(year)}" y="${y(values[year]) - 10}" text-anchor="middle">${formatMoney(values[year], settings.currency)}</text>`).join('')

  return `<svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="Estimated investment value over ten years at ${returnRate} percent"><line x1="${padding.left}" y1="${y(0)}" x2="${chartWidth - padding.right}" y2="${y(0)}" class="chart-axis" />${yTicks.slice(1).map((value) => `<line x1="${padding.left}" y1="${y(value)}" x2="${chartWidth - padding.right}" y2="${y(value)}" class="chart-grid" />`).join('')}${yLabels}${xLabels}<polyline points="${linePoints}" class="chart-line" />${markers}<text x="${padding.left}" y="16" class="chart-label">Estimated invested value</text><text x="${chartWidth - padding.right}" y="${y(0) - 8}" text-anchor="end" class="chart-baseline">BNPL purchase: $0 invested</text></svg>`
}
