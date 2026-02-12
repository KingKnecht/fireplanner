export interface User {
  id: string
  name: string
  color?: string
}

export interface Project {
  id: string
  name: string
  userId: string | null  // null for unassigned
  startDate: Date
  endDate: Date
  durationDays: number  // Project duration in work days (can be 0.5, 1, 1.5, etc.)
  bufferPercent: number  // 0, 10, 25, 33, 50, 75, 100
  capacityPercent: number  // 33, 50, 75, 100 - daily capacity available
  color: string
  zIndex: number  // z-depth for overlapping projects
}

export interface DateCell {
  date: Date
  isWeekend: boolean
}
