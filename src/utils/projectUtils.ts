import { isWorkingDay } from './dateUtils'
import type { Project } from '../types'

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
  capacityPercent: number = 100,
  workingDays: number[] = [1, 2, 3, 4, 5]
): Date {
  // Calculate total duration with buffer
  const totalDuration = durationDays * (1 + bufferPercent / 100)
  
  // Adjust for capacity (50% capacity = takes twice as long)
  const adjustedDuration = totalDuration / (capacityPercent / 100)
  
  // Round up to nearest half day
  const roundedDuration = Math.ceil(adjustedDuration * 2) / 2
  
  // Calculate end date (working days only)
  const endDate = new Date(startDate)
  let daysAdded = 0
  
  while (daysAdded < roundedDuration) {
    // Skip non-working days
    if (isWorkingDay(endDate, workingDays)) {
      daysAdded += 1
    }
    if (daysAdded < roundedDuration) {
      endDate.setDate(endDate.getDate() + 1)
    }
  }
  
  return endDate
}

export function calculateWorkdayDuration(startDate: Date, endDate: Date, workingDays: number[] = [1, 2, 3, 4, 5]): number {
  let days = 0
  const current = new Date(startDate)
  
  while (current <= endDate) {
    if (isWorkingDay(current, workingDays)) {
      days++
    }
    current.setDate(current.getDate() + 1)
  }
  
  return days
}

/**
 * Check if two projects overlap in time
 */
export function projectsOverlap(project1: Project, project2: Project, workingDays: number[] = [1, 2, 3, 4, 5]): boolean {
  const end1 = calculateProjectEndDate(
    project1.startDate,
    project1.durationDays,
    project1.bufferPercent,
    project1.capacityPercent,
    workingDays
  )
  
  const end2 = calculateProjectEndDate(
    project2.startDate,
    project2.durationDays,
    project2.bufferPercent,
    project2.capacityPercent,
    workingDays
  )
  
  // Projects overlap if: start1 <= end2 AND start2 <= end1
  return project1.startDate <= end2 && project2.startDate <= end1
}

/**
 * Assign lanes to projects so overlapping projects don't visually collide.
 * Projects with lower capacity (less width) can share lanes with others if there's space.
 * Returns a map of project ID to lane assignment { lane, maxLanes }
 */
export function assignProjectLanes(
  projects: Project[],
  workingDays: number[] = [1, 2, 3, 4, 5]
): Map<string, { lane: number; maxLanes: number; offset: number }> {
  const result = new Map<string, { lane: number; maxLanes: number; offset: number }>()
  
  if (projects.length === 0) return result
  
  // Sort projects by start date, then by end date
  const sortedProjects = [...projects].sort((a, b) => {
    const diff = a.startDate.getTime() - b.startDate.getTime()
    if (diff !== 0) return diff
    
    const endA = calculateProjectEndDate(a.startDate, a.durationDays, a.bufferPercent, a.capacityPercent, workingDays)
    const endB = calculateProjectEndDate(b.startDate, b.durationDays, b.bufferPercent, b.capacityPercent, workingDays)
    return endA.getTime() - endB.getTime()
  })
  
  // Track lanes with their currently occupied sections
  // Each lane tracks: [{ project, endDate, widthUsed }]
  const lanes: Array<Array<{ project: Project; endDate: Date; widthUsed: number }>> = []
  
  for (const project of sortedProjects) {
    const projectEnd = calculateProjectEndDate(
      project.startDate,
      project.durationDays,
      project.bufferPercent,
      project.capacityPercent,
      workingDays
    )
    
    // Find the first lane where this project can fit
    let assignedLane = -1
    let offset = 0
    
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i]
      if (!lane) continue
      
      // Remove expired projects from this lane
      const activeLane = lane.filter(item => item.endDate >= project.startDate)
      lanes[i] = activeLane
      
      // Calculate total width used in this lane at this time
      let widthUsed = 0
      for (const item of activeLane) {
        if (projectsOverlap(project, item.project, workingDays)) {
          widthUsed += item.project.capacityPercent
        }
      }
      
      // Check if this project can fit in this lane
      if (widthUsed + project.capacityPercent <= 100) {
        assignedLane = i
        offset = widthUsed
        const currentLane = lanes[i]
        if (currentLane) {
          currentLane.push({ project, endDate: projectEnd, widthUsed: project.capacityPercent })
        }
        break
      }
    }
    
    // If no lane fits, create a new one
    if (assignedLane === -1) {
      assignedLane = lanes.length
      offset = 0
      lanes.push([{ project, endDate: projectEnd, widthUsed: project.capacityPercent }])
    }
    
    result.set(project.id, { lane: assignedLane, maxLanes: lanes.length, offset })
  }
  
  // Update maxLanes for all projects
  const maxLanes = lanes.length
  for (const [_projectId, info] of result.entries()) {
    info.maxLanes = maxLanes
  }
  
  return result
}
