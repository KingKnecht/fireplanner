import { ref } from 'vue'

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function isWorkingDay(date: Date, workingDays: number[] = [1, 2, 3, 4, 5]): boolean {
  const day = date.getDay()
  return workingDays.includes(day)
}

export function getWeekdaysBetween(startDate: Date, endDate: Date, workingDays: number[] = [1, 2, 3, 4, 5]): Date[] {
  const dates: Date[] = []
  const current = new Date(startDate)
  
  while (current <= endDate) {
    if (isWorkingDay(current, workingDays)) {
      dates.push(new Date(current))
    }
    current.setDate(current.getDate() + 1)
  }
  
  return dates
}

// Global locale for formatting (can be set from config)
// Using reactive ref so Vue can track changes
const currentLocale = ref('de-DE') // Default to German

// Export locale ref for reactive access
export { currentLocale }

export function setLocale(locale: string) {
  currentLocale.value = locale
}

export function getLocale(): string {
  return currentLocale.value
}

export function formatDate(date: Date, locale?: string): string {
  if (!date) return ''
  const loc = locale || currentLocale.value
  return new Intl.DateTimeFormat(loc, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

export function formatNumber(value: number, locale?: string, options?: Intl.NumberFormatOptions): string {
  const loc = locale || currentLocale.value
  return new Intl.NumberFormat(loc, options).format(value)
}

// Get PrimeVue DatePicker format string based on current locale
export function getDatePickerFormat(locale?: string): string {
  const loc = locale || currentLocale.value
  // Map locales to PrimeVue format strings
  const localeFormatMap: Record<string, string> = {
    'en-US': 'mm/dd/yy',     // US format: 02/18/26
    'en-GB': 'dd/mm/yy',     // British format: 18/02/26
    'de-DE': 'dd.mm.yy',     // German format: 18.02.26
    'de-AT': 'dd.mm.yy',     // Austrian format: 18.02.26
    'de-CH': 'dd.mm.yy',     // Swiss German format: 18.02.26
    'fr-FR': 'dd/mm/yy',     // French format: 18/02/26
    'it-IT': 'dd/mm/yy',     // Italian format: 18/02/26
    'es-ES': 'dd/mm/yy',     // Spanish format: 18/02/26
    'nl-NL': 'dd-mm-yy',     // Dutch format: 18-02-26
    'pt-PT': 'dd/mm/yy',     // Portuguese format: 18/02/26
    'sv-SE': 'yy-mm-dd',     // Swedish format: 26-02-18
    'ja-JP': 'yy/mm/dd',     // Japanese format: 26/02/18
    'zh-CN': 'yy/mm/dd',     // Chinese format: 26/02/18
    'ko-KR': 'yy.mm.dd',     // Korean format: 26.02.18
  }
  
  // First try exact match
  if (localeFormatMap[loc]) {
    return localeFormatMap[loc]
  }
  
  // Try language code only (e.g., 'en' from 'en-CA')
  const languageCode = loc.split('-')[0]
  if (languageCode) {
    const languageMatch = Object.keys(localeFormatMap).find(key => key.startsWith(languageCode))
    if (languageMatch && localeFormatMap[languageMatch]) {
      return localeFormatMap[languageMatch]
    }
  }
  
  // Default to European format (day/month/year)
  return 'dd/mm/yy'
}

export function toInputDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${year}-${month}-${day}`
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate()
}

export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.floor((endUtc - startUtc) / msPerDay) + 1
}
