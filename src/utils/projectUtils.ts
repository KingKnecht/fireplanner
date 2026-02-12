export const COLOR_PALETTE = [
  '#EF5350', // Red
  '#EC407A', // Pink
  '#AB47BC', // Purple
  '#7E57C2', // Deep Purple
  '#5C6BC0', // Indigo
  '#42A5F5', // Blue
  '#29B6F6', // Light Blue
  '#26C6DA', // Cyan
  '#26A69A', // Teal
  '#66BB6A', // Green
  '#9CCC65', // Light Green
  '#D4E157', // Lime
  '#FFEE58', // Yellow
  '#FFA726', // Orange
  '#FF7043', // Deep Orange
  '#8D6E63', // Brown
]

export function calculateProjectEndDate(
  startDate: Date,
  durationDays: number,
  bufferPercent: number,
  capacityPercent: number = 100
): Date {
  // Calculate total duration with buffer
  const totalDuration = durationDays * (1 + bufferPercent / 100)
  
  // Adjust for capacity (50% capacity = takes twice as long)
  const adjustedDuration = totalDuration / (capacityPercent / 100)
  
  // Round up to nearest half day
  const roundedDuration = Math.ceil(adjustedDuration * 2) / 2
  
  // Calculate end date (weekdays only)
  const endDate = new Date(startDate)
  let daysAdded = 0
  
  while (daysAdded < roundedDuration) {
    // Skip weekends
    if (endDate.getDay() !== 0 && endDate.getDay() !== 6) {
      daysAdded += 1
    }
    if (daysAdded < roundedDuration) {
      endDate.setDate(endDate.getDate() + 1)
    }
  }
  
  return endDate
}

export function calculateWorkdayDuration(startDate: Date, endDate: Date): number {
  let days = 0
  const current = new Date(startDate)
  
  while (current <= endDate) {
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      days++
    }
    current.setDate(current.getDate() + 1)
  }
  
  return days
}
