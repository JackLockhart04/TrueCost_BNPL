import type { Purchase, Settings } from './types'

const PURCHASES_KEY = 'truecost-bnpl-purchases'
const SETTINGS_KEY = 'truecost-bnpl-settings'

const defaultSettings: Settings = {
  currency: 'USD',
}

export function loadPurchases(): Purchase[] {
  const savedPurchases = localStorage.getItem(PURCHASES_KEY)

  if (!savedPurchases) return []

  try {
    return JSON.parse(savedPurchases) as Purchase[]
  } catch {
    return []
  }
}

export function savePurchases(purchases: Purchase[]): void {
  localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases))
}

export function clearSavedData(): void {
  localStorage.removeItem(PURCHASES_KEY)
  localStorage.removeItem(SETTINGS_KEY)
}

export function loadSettings(): Settings {
  const savedSettings = localStorage.getItem(SETTINGS_KEY)

  if (!savedSettings) return defaultSettings

  try {
    return { ...defaultSettings, ...(JSON.parse(savedSettings) as Partial<Settings>) }
  } catch {
    return defaultSettings
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
