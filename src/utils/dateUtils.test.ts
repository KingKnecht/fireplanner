import { describe, it, expect } from 'vitest'
import {
  isWeekend,
  getWeekdaysBetween,
  formatDate,
  toInputDate,
  isSameDay,
  daysBetween
} from './dateUtils'

describe('dateUtils', () => {
  describe('isWeekend', () => {
    it('should return true for Saturday', () => {
      const saturday = new Date(2026, 1, 14) // February 14, 2026 is a Saturday
      expect(isWeekend(saturday)).toBe(true)
    })

    it('should return true for Sunday', () => {
      const sunday = new Date(2026, 1, 15) // February 15, 2026 is a Sunday
      expect(isWeekend(sunday)).toBe(true)
    })

    it('should return false for Monday', () => {
      const monday = new Date(2026, 1, 16) // February 16, 2026 is a Monday
      expect(isWeekend(monday)).toBe(false)
    })

    it('should return false for Friday', () => {
      const friday = new Date(2026, 1, 13) // February 13, 2026 is a Friday
      expect(isWeekend(friday)).toBe(false)
    })
  })

  describe('getWeekdaysBetween', () => {
    it('should return only weekdays in a range', () => {
      // Feb 9-15, 2026: Mon-Sun (5 weekdays)
      const start = new Date(2026, 1, 9)
      const end = new Date(2026, 1, 15)
      const weekdays = getWeekdaysBetween(start, end)
      
      expect(weekdays).toHaveLength(5)
      expect(weekdays.every(d => !isWeekend(d))).toBe(true)
    })

    it('should return empty array for weekend-only range', () => {
      const saturday = new Date(2026, 1, 14)
      const sunday = new Date(2026, 1, 15)
      const weekdays = getWeekdaysBetween(saturday, sunday)
      
      expect(weekdays).toHaveLength(0)
    })

    it('should return single day if start equals end and is weekday', () => {
      const monday = new Date(2026, 1, 16)
      const weekdays = getWeekdaysBetween(monday, monday)
      
      expect(weekdays).toHaveLength(1)
      expect(weekdays[0]).toEqual(monday)
    })

    it('should return correct count for a full work week', () => {
      const monday = new Date(2026, 1, 16)
      const friday = new Date(2026, 1, 20)
      const weekdays = getWeekdaysBetween(monday, friday)
      
      expect(weekdays).toHaveLength(5)
    })
  })

  describe('formatDate', () => {
    it('should format date as DD.MM.YYYY', () => {
      const date = new Date(2026, 0, 5) // January 5, 2026
      expect(formatDate(date)).toBe('05.01.2026')
    })

    it('should pad single digit day and month', () => {
      const date = new Date(2026, 8, 3) // September 3, 2026
      expect(formatDate(date)).toBe('03.09.2026')
    })

    it('should not pad double digit values', () => {
      const date = new Date(2026, 11, 25) // December 25, 2026
      expect(formatDate(date)).toBe('25.12.2026')
    })
  })

  describe('toInputDate', () => {
    it('should format date as YYYY-MM-DD for input fields', () => {
      const date = new Date(2026, 0, 5) // January 5, 2026
      expect(toInputDate(date)).toBe('2026-01-05')
    })

    it('should pad single digit values', () => {
      const date = new Date(2026, 8, 3) // September 3, 2026
      expect(toInputDate(date)).toBe('2026-09-03')
    })
  })

  describe('isSameDay', () => {
    it('should return true for same date', () => {
      const date1 = new Date(2026, 1, 13, 10, 30)
      const date2 = new Date(2026, 1, 13, 15, 45)
      expect(isSameDay(date1, date2)).toBe(true)
    })

    it('should return false for different days', () => {
      const date1 = new Date(2026, 1, 13)
      const date2 = new Date(2026, 1, 14)
      expect(isSameDay(date1, date2)).toBe(false)
    })

    it('should return false for different months', () => {
      const date1 = new Date(2026, 1, 13)
      const date2 = new Date(2026, 2, 13)
      expect(isSameDay(date1, date2)).toBe(false)
    })

    it('should return false for different years', () => {
      const date1 = new Date(2026, 1, 13)
      const date2 = new Date(2027, 1, 13)
      expect(isSameDay(date1, date2)).toBe(false)
    })
  })

  describe('daysBetween', () => {
    it('should return 1 for same day', () => {
      const date = new Date(2026, 1, 13)
      expect(daysBetween(date, date)).toBe(1)
    })

    it('should return correct count including both start and end', () => {
      const start = new Date(2026, 1, 13) // Feb 13
      const end = new Date(2026, 1, 15)   // Feb 15
      expect(daysBetween(start, end)).toBe(3) // 13, 14, 15
    })

    it('should work across month boundaries', () => {
      const start = new Date(2026, 0, 30) // Jan 30
      const end = new Date(2026, 1, 2)     // Feb 2
      expect(daysBetween(start, end)).toBe(4) // 30, 31, 1, 2
    })

    it('should work across year boundaries', () => {
      const start = new Date(2025, 11, 30) // Dec 30, 2025
      const end = new Date(2026, 0, 2)      // Jan 2, 2026
      expect(daysBetween(start, end)).toBe(4) // 30, 31, 1, 2
    })
  })
})
