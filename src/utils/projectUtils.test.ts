import { describe, it, expect } from 'vitest'
import { calculateProjectEndDate, calculateWorkdayDuration, COLOR_PALETTE } from './projectUtils'

describe('projectUtils', () => {
  describe('COLOR_PALETTE', () => {
    it('should have 16 colors', () => {
      expect(COLOR_PALETTE).toHaveLength(16)
    })

    it('should contain only hex color strings', () => {
      COLOR_PALETTE.forEach(color => {
        expect(color).toMatch(/^#[0-9A-F]{6}$/i)
      })
    })
  })

  describe('calculateProjectEndDate', () => {
    it('should calculate end date for simple duration', () => {
      const start = new Date(2026, 1, 16) // Monday, Feb 16, 2026
      const end = calculateProjectEndDate(start, 5, 0, 100)
      
      // 5 days from Monday = Friday
      expect(end.getDate()).toBe(20)
      expect(end.getMonth()).toBe(1) // February
    })

    it('should skip weekends when calculating', () => {
      const start = new Date(2026, 1, 13) // Friday, Feb 13, 2026
      const end = calculateProjectEndDate(start, 3, 0, 100)
      
      // 3 days from Friday = Tue (skipping Sat, Sun)
      expect(end.getDate()).toBe(17) // Tuesday
      expect(end.getMonth()).toBe(1)
    })

    it('should apply buffer percentage', () => {
      const start = new Date(2026, 1, 16) // Monday
      const end = calculateProjectEndDate(start, 10, 20, 100)
      
      // 10 days + 20% buffer = 12 days
      const workdays = calculateWorkdayDuration(start, end)
      expect(workdays).toBe(12)
    })

    it('should adjust for reduced capacity', () => {
      const start = new Date(2026, 1, 16) // Monday
      const end = calculateProjectEndDate(start, 5, 0, 50)
      
      // 5 days at 50% capacity = 10 days
      const workdays = calculateWorkdayDuration(start, end)
      expect(workdays).toBe(10)
    })

    it('should combine buffer and capacity adjustments', () => {
      const start = new Date(2026, 1, 16) // Monday
      const end = calculateProjectEndDate(start, 10, 20, 50)
      
      // 10 days + 20% buffer = 12 days
      // 12 days at 50% capacity = 24 days
      const workdays = calculateWorkdayDuration(start, end)
      expect(workdays).toBe(24)
    })

    it('should round up to nearest half day', () => {
      const start = new Date(2026, 1, 16) // Monday
      // 10 days at 75% capacity = 13.33... days → rounds to 13.5 days
      const end = calculateProjectEndDate(start, 10, 0, 75)
      
      const workdays = calculateWorkdayDuration(start, end)
      expect(workdays).toBe(14) // Rounded up from 13.5
    })

    it('should handle single day projects', () => {
      const start = new Date(2026, 1, 16) // Monday
      const end = calculateProjectEndDate(start, 1, 0, 100)
      
      expect(end.getDate()).toBe(16)
      expect(end.getMonth()).toBe(1)
    })
  })

  describe('calculateWorkdayDuration', () => {
    it('should count only weekdays', () => {
      const start = new Date(2026, 1, 16) // Monday, Feb 16
      const end = new Date(2026, 1, 20)   // Friday, Feb 20
      
      expect(calculateWorkdayDuration(start, end)).toBe(5)
    })

    it('should skip weekends', () => {
      const start = new Date(2026, 1, 13) // Friday, Feb 13
      const end = new Date(2026, 1, 17)   // Tuesday, Feb 17
      
      // Fri, Mon, Tue = 3 weekdays
      expect(calculateWorkdayDuration(start, end)).toBe(3)
    })

    it('should return 1 for same day', () => {
      const date = new Date(2026, 1, 16) // Monday
      expect(calculateWorkdayDuration(date, date)).toBe(1)
    })

    it('should return 0 for weekend-only period', () => {
      const saturday = new Date(2026, 1, 14)
      const sunday = new Date(2026, 1, 15)
      
      expect(calculateWorkdayDuration(saturday, sunday)).toBe(0)
    })

    it('should work across months', () => {
      const start = new Date(2026, 0, 29) // Thursday, Jan 29
      const end = new Date(2026, 1, 2)     // Monday, Feb 2
      
      // Thu, Fri, Mon = 3 weekdays
      expect(calculateWorkdayDuration(start, end)).toBe(3)
    })
  })
})
