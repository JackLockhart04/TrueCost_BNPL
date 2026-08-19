import { formatMoney, getPortfolioOpportunityValue, getRemainingInstallments } from './calculations'
import type { Purchase, Settings } from './types'

type InvestmentChartProps = {
  purchases: Purchase[]
  settings: Settings
  returnRate: number
  selectedPurchaseIds: string[]
}

const purchaseColors = ['#4254c5', '#16806c', '#c46a1a', '#9a3f88', '#2774a6']
const chartMonths = Array.from({ length: 121 }, (_, month) => month)

export function renderInvestmentChart({ purchases, settings, returnRate, selectedPurchaseIds }: InvestmentChartProps): string {
  const activePurchases = purchases.filter((purchase) => getRemainingInstallments(purchase) > 0)
  const selectedPurchases = activePurchases.filter((purchase) => selectedPurchaseIds.includes(purchase.id))
  const colors = new Map(activePurchases.map((purchase, index) => [purchase.id, purchaseColors[index % purchaseColors.length]]))
  const selectionControls = activePurchases.map((purchase) => `<button data-action="toggle-chart-purchase" data-id="${purchase.id}" aria-pressed="${selectedPurchaseIds.includes(purchase.id)}" class="${selectedPurchaseIds.includes(purchase.id) ? 'selected' : ''}" style="--purchase-color: ${colors.get(purchase.id)}"><span class="purchase-color-dot"></span>${purchase.name}</button>`).join('')

  if (activePurchases.length === 0) return `<section class="panel investment-chart empty-chart"><h2>What your BNPL payments could become</h2><p>Add a purchase with payments remaining to see an investment-growth illustration here.</p></section>`

  const tenYearValue = getPortfolioOpportunityValue(selectedPurchases, 10, returnRate)
  const chart = selectedPurchases.length === 0
    ? '<p class="empty-chart-message">Select at least one purchase below to show its investment projection.</p>'
    : renderChartSvg(selectedPurchases, settings, returnRate, colors)

  return `<section class="panel investment-chart"><div class="section-heading"><div><h2>What your BNPL payments could become</h2><p>Estimated value of investing every unpaid payment instead of spending it.</p></div></div><div class="chart-controls" aria-label="Investment comparison rate"><button data-action="chart-rate" data-rate="4" class="${returnRate === 4 ? 'selected' : ''}">4% - High-yield savings</button><button data-action="chart-rate" data-rate="8" class="${returnRate === 8 ? 'selected' : ''}">8% - S&P 500</button></div>${chart}<p class="chart-lesson">At ${returnRate}%, the selected payments could be worth <strong>${formatMoney(tenYearValue, settings.currency)}</strong> in 10 years. This estimate uses scheduled unpaid payments only; actual investment returns vary.</p><div class="chart-purchase-controls"><span>Show purchases:</span>${selectionControls}</div></section>`
}

function renderChartSvg(purchases: Purchase[], settings: Settings, returnRate: number, colors: Map<string, string>): string {
  const width = 720
  const height = 300
  const padding = { top: 28, right: 24, bottom: 45, left: 74 }
  const series = purchases.map((purchase) => ({
    purchase,
    values: chartMonths.map((month) => getPortfolioOpportunityValue([purchase], month / 12, returnRate)),
  }))
  const totals = chartMonths.map((_, month) => series.reduce((sum, item) => sum + item.values[month], 0))
  const maximum = Math.max(...totals, 1)
  const x = (month: number) => padding.left + (month / 120) * (width - padding.left - padding.right)
  const y = (value: number) => height - padding.bottom - (value / maximum) * (height - padding.top - padding.bottom)
  const yTicks = [0, maximum / 2, maximum]
  const yLabels = yTicks.map((value) => `<text x="${padding.left - 10}" y="${y(value) + 4}" text-anchor="end">${formatMoney(value, settings.currency)}</text>`).join('')
  const xLabels = [0, 5, 10].map((year) => `<text x="${x(year * 12)}" y="${height - 14}" text-anchor="middle">${year} years</text>`).join('')
  const areas = series.map((item, index) => {
    const lowerValues = totals.map((_, year) => series.slice(0, index).reduce((sum, previous) => sum + previous.values[year], 0))
    const upperPoints = item.values.map((value, month) => `${x(month)},${y(lowerValues[month] + value)}`)
    const lowerPoints = lowerValues.map((value, month) => `${x(month)},${y(value)}`).reverse()
    return `<polygon points="${[...upperPoints, ...lowerPoints].join(' ')}" fill="${colors.get(item.purchase.id)}" class="chart-area"><title>${item.purchase.name}</title></polygon>`
  }).join('')
  const totalLine = totals.map((value, month) => `${x(month)},${y(value)}`).join(' ')
  const comparisonRate = returnRate === 4 ? 8 : 4
  const comparisonLine = chartMonths
    .map((month) => getPortfolioOpportunityValue(purchases, month / 12, comparisonRate))
    .map((value, month) => `${x(month)},${y(value)}`)
    .join(' ')
  const markers = [1, 5, 10].map((year) => {
    const month = year * 12
    return `<circle cx="${x(month)}" cy="${y(totals[month])}" r="4" /><text x="${x(month)}" y="${y(totals[month]) - 10}" text-anchor="middle">${formatMoney(totals[month], settings.currency)}</text>`
  }).join('')
  return `<div class="chart-legend"><span><i class="legend-line"></i>${returnRate}% stacked total</span><span><i class="legend-line comparison-rate"></i>${comparisonRate}% comparison</span></div><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Stacked estimated investment value over ten years at ${returnRate} percent"><line x1="${padding.left}" y1="${y(0)}" x2="${width - padding.right}" y2="${y(0)}" class="chart-axis" />${yTicks.slice(1).map((value) => `<line x1="${padding.left}" y1="${y(value)}" x2="${width - padding.right}" y2="${y(value)}" class="chart-grid" />`).join('')}${yLabels}${xLabels}${areas}<polyline points="${comparisonLine}" class="chart-comparison-line" /><polyline points="${totalLine}" class="chart-total-line" />${markers}<text x="${padding.left}" y="16" class="chart-label">Estimated invested value</text><text x="${width - padding.right}" y="${y(0) - 8}" text-anchor="end" class="chart-baseline">BNPL purchase: $0 invested</text></svg>`
}
