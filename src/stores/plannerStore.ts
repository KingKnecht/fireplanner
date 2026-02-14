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

  const weekdays = computed(() => {
    return getWeekdaysBetween(startDate.value, endDate.value)
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
      project.capacityPercent
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
        endDate: currentProject.endDate
      }
      
      // Recalculate end date if duration, buffer, capacity, or start date changed
      if (updates.startDate || updates.durationDays !== undefined || updates.bufferPercent !== undefined || updates.capacityPercent !== undefined) {
        updatedProject.endDate = calculateProjectEndDate(
          updatedProject.startDate,
          updatedProject.durationDays,
          updatedProject.bufferPercent,
          updatedProject.capacityPercent
        )
      }
      
      // Auto-expand date range if project is outside current range
      if (updatedProject.startDate < startDate.value) {
        startDate.value = new Date(updatedProject.startDate.getFullYear(), 0, 1)
      }
      if (updatedProject.endDate > endDate.value) {
        endDate.value = new Date(updatedProject.endDate.getFullYear(), 11, 31)
      }
      
      projects.value[index] = updatedProject
    }
  }

  function deleteProject(id: string) {
    projects.value = projects.value.filter(p => p.id !== id)
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
    weekdays,
    addUser,
    removeUser,
    addProject,
    updateProject,
    deleteProject,
    getProjectsForUser
  }
}, {
  // @ts-ignore - pinia-plugin-history adds history option
  history: true
})
