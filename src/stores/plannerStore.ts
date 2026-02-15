import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { nanoid } from 'nanoid'
import type { User, Project } from '../types'
import { getWeekdaysBetween } from '../utils/dateUtils'
import { calculateProjectEndDate } from '../utils/projectUtils'

export const usePlannerStore = defineStore('planner', () => {
  const users = ref<User[]>([])

  const projects = ref<Project[]>([])

  const startDate = ref(new Date(2026, 0, 1)) // January 1, 2026
  const endDate = ref(new Date(2026, 11, 31)) // December 31, 2026
  
  const workingDays = ref<number[]>([1, 2, 3, 4, 5]) // Monday-Friday by default

  const weekdays = computed(() => {
    return getWeekdaysBetween(startDate.value, endDate.value, workingDays.value)
  })

  function addUser(name: string, color?: string) {
    const newUser: User = {
      id: nanoid(10),
      name,
      color: color || `#${Math.floor(Math.random() * 16777215).toString(16)}`
    }
    users.value.push(newUser)
  }

  function removeUser(userId: string) {
    // Move all projects from this user to unassigned
    projects.value.forEach((project, index) => {
      if (project.userId === userId) {
        projects.value[index] = { ...project, userId: null }
      }
    })
    // Remove the user
    users.value = users.value.filter(u => u.id !== userId)
  }

  function addProject(project: Omit<Project, 'id' | 'endDate' | 'zIndex'> & { zIndex?: number }) {
    const projectEndDate = calculateProjectEndDate(
      project.startDate,
      project.durationDays,
      project.bufferPercent,
      project.capacityPercent,
      workingDays.value
    )
    
    // Auto-expand date range if project is outside current range
    if (project.startDate < startDate.value) {
      startDate.value = new Date(project.startDate.getFullYear(), 0, 1)
    }
    if (projectEndDate > endDate.value) {
      endDate.value = new Date(projectEndDate.getFullYear(), 11, 31)
    }
    
    const newProject: Project = {
      ...project,
      id: nanoid(10),
      endDate: projectEndDate,
      zIndex: project.zIndex ?? 1,
      customProperties: project.customProperties || {}
    }
    projects.value.push(newProject)
    return newProject
  }

  function updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'endDate'>>) {
    const index = projects.value.findIndex(p => p.id === id)
    if (index !== -1) {
      const currentProject = projects.value[index]!
      
      const updatedProject = {
        id: currentProject.id,
        name: updates.name ?? currentProject.name,
        userId: updates.userId !== undefined ? updates.userId : currentProject.userId,
        startDate: updates.startDate ?? currentProject.startDate,
        durationDays: updates.durationDays ?? currentProject.durationDays,
        bufferPercent: updates.bufferPercent ?? currentProject.bufferPercent,
        capacityPercent: updates.capacityPercent ?? currentProject.capacityPercent,
        color: updates.color ?? currentProject.color,
        zIndex: updates.zIndex !== undefined ? updates.zIndex : currentProject.zIndex,
        customProperties: updates.customProperties !== undefined ? updates.customProperties : currentProject.customProperties,
        parentProjectId: updates.parentProjectId !== undefined ? updates.parentProjectId : currentProject.parentProjectId,
        originalDurationDays: updates.originalDurationDays !== undefined ? updates.originalDurationDays : currentProject.originalDurationDays,
        overallDurationDays: updates.overallDurationDays !== undefined ? updates.overallDurationDays : currentProject.overallDurationDays,
        endDate: currentProject.endDate
      }
      
      // Recalculate end date if duration, buffer, capacity, or start date changed
      if (updates.startDate || updates.durationDays !== undefined || updates.bufferPercent !== undefined || updates.capacityPercent !== undefined) {
        updatedProject.endDate = calculateProjectEndDate(
          updatedProject.startDate,
          updatedProject.durationDays,
          updatedProject.bufferPercent,
          updatedProject.capacityPercent,
          workingDays.value
        )
      }
      
      // Auto-expand date range if project is outside current range
      if (updatedProject.startDate < startDate.value) {
        startDate.value = new Date(updatedProject.startDate.getFullYear(), 0, 1)
      }
      if (updatedProject.endDate > endDate.value) {
        endDate.value = new Date(updatedProject.endDate.getFullYear(), 11, 31)
      }
      
      // If this is a split project, propagate shared property changes to all related splits
      if (currentProject.parentProjectId || currentProject.originalDurationDays !== undefined) {
        const parentId = currentProject.parentProjectId || currentProject.id
        const sharedUpdates: Partial<Omit<Project, 'id' | 'endDate' | 'userId' | 'startDate' | 'durationDays'>> = {}
        
        // Properties that should be synchronized across all splits
        if (updates.name !== undefined) sharedUpdates.name = updates.name
        if (updates.color !== undefined) sharedUpdates.color = updates.color
        if (updates.customProperties !== undefined) sharedUpdates.customProperties = updates.customProperties
        if (updates.zIndex !== undefined) sharedUpdates.zIndex = updates.zIndex
        if (updates.overallDurationDays !== undefined) sharedUpdates.overallDurationDays = updates.overallDurationDays
        
        // Update all related split projects (except the current one)
        if (Object.keys(sharedUpdates).length > 0) {
          const allSplits = getSplitProjects(parentId)
          
          // Create a new projects array with all updates applied
          projects.value = projects.value.map(p => {
            // Update the current project
            if (p.id === id) {
              return updatedProject
            }
            // Update related splits
            const matchingSplit = allSplits.find(s => s.id === p.id && s.id !== id)
            if (matchingSplit) {
              const updatedSplit = {
                ...p,
                ...sharedUpdates
              }
              
              return updatedSplit
            }
            // Return unchanged projects
            return p
          })
        } else {
          // No split synchronization needed, just update the single project
          projects.value[index] = updatedProject
        }
      } else {
        // Not a split project, just update normally
        projects.value[index] = updatedProject
      }
    }
  }

  function deleteProject(id: string) {
    const project = projects.value.find(p => p.id === id)
    
    // If deleting a split project, check if it's the last remaining split
    if (project?.parentProjectId) {
      const allSplits = getSplitProjects(project.parentProjectId)
      
      // If only 2 splits remain (parent + this one), convert parent back to normal
      if (allSplits.length === 2) {
        const parentProject = projects.value.find(p => p.id === project.parentProjectId)
        if (parentProject) {
          // Remove split-related fields and restore to normal project
          const index = projects.value.findIndex(p => p.id === parentProject.id)
          if (index !== -1) {
            projects.value[index] = {
              ...parentProject,
              parentProjectId: undefined,
              originalDurationDays: undefined,
              overallDurationDays: undefined,
              durationDays: parentProject.originalDurationDays || parentProject.durationDays
            }
            // Recalculate end date
            projects.value[index]!.endDate = calculateProjectEndDate(
              projects.value[index]!.startDate,
              projects.value[index]!.durationDays,
              projects.value[index]!.bufferPercent,
              projects.value[index]!.capacityPercent,
              workingDays.value
            )
          }
        }
      }
    }
    
    projects.value = projects.value.filter(p => p.id !== id)
  }

  function splitProject(id: string) {
    const project = projects.value.find(p => p.id === id)
    if (!project) return
    
    // Cannot split if duration is less than 1 day
    if (project.durationDays < 1) {
      console.warn('Cannot split project with duration less than 1 day')
      return
    }
    
    const parentId = project.parentProjectId || project.id
    const originalDuration = project.originalDurationDays || project.durationDays
    const overallDuration = project.overallDurationDays || project.durationDays
    
    // Update current project: reduce duration by 1 day and mark as split
    updateProject(project.id, {
      durationDays: project.durationDays - 1,
      parentProjectId: parentId,
      originalDurationDays: originalDuration,
      overallDurationDays: overallDuration
    })
    
    // Get updated project to find its new end date
    const updatedProject = projects.value.find(p => p.id === id)
    if (!updatedProject) return
    
    // Calculate start date for new split (day after parent ends)
    const newStartDate = new Date(updatedProject.endDate)
    newStartDate.setDate(newStartDate.getDate() + 1)
    
    // Skip weekends to find next working day
    while (newStartDate.getDay() === 0 || newStartDate.getDay() === 6) {
      newStartDate.setDate(newStartDate.getDate() + 1)
    }
    
    // Create new split project with 1 day duration
    addProject({
      name: project.name,
      userId: project.userId,
      startDate: newStartDate,
      durationDays: 1,
      bufferPercent: project.bufferPercent,
      capacityPercent: project.capacityPercent,
      color: project.color,
      zIndex: project.zIndex,
      customProperties: { ...project.customProperties },
      parentProjectId: parentId,
      originalDurationDays: originalDuration,
      overallDurationDays: overallDuration
    })
  }

  function getSplitProjects(parentId: string): Project[] {
    return projects.value.filter(p => 
      p.id === parentId || p.parentProjectId === parentId
    )
  }

  function getProjectsForUser(userId: string | null) {
    return projects.value.filter(p => p.userId === userId)
  }

  // Fix dates after undo/redo (pinia-plugin-history converts Date to string)
  watch(projects, (newProjects) => {
    newProjects.forEach((project, index) => {
      if (typeof project.startDate === 'string') {
        projects.value[index] = {
          ...project,
          startDate: new Date(project.startDate),
          endDate: new Date(project.endDate),
          // Fix custom property Dates that may have been stringified
          customProperties: project.customProperties ? 
            Object.fromEntries(
              Object.entries(project.customProperties).map(([key, value]) => [
                key,
                typeof value === 'string' && !isNaN(Date.parse(value)) && value.includes('T') 
                  ? new Date(value)
                  : value
              ])
            ) : {}
        }
      }
    })
  }, { deep: true })

  watch([startDate, endDate], () => {
    if (typeof startDate.value === 'string') {
      startDate.value = new Date(startDate.value)
    }
    if (typeof endDate.value === 'string') {
      endDate.value = new Date(endDate.value)
    }
  })

  return {
    users,
    projects,
    startDate,
    endDate,
    workingDays,
    weekdays,
    addUser,
    removeUser,
    addProject,
    updateProject,
    deleteProject,
    splitProject,
    getSplitProjects,
    getProjectsForUser
  }
}, {
  // @ts-ignore - pinia-plugin-history adds history option
  history: true
})
