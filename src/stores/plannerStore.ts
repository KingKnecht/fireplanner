import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { nanoid } from 'nanoid'
import type { User, Project } from '../types'
import { getWeekdaysBetween } from '../utils/dateUtils'
import { calculateProjectEndDate } from '../utils/projectUtils'

export const usePlannerStore = defineStore('planner', () => {
  const users = ref<User[]>([
    { id: nanoid(10), name: 'Sven', color: '#7BA3D1' },
    { id: nanoid(10), name: 'Martin', color: '#E4A261' },
    { id: nanoid(10), name: 'Marc', color: '#26b821' },
    { id: nanoid(10), name: 'Roland', color: '#315fdd' }
  ])

  const projects = ref<Project[]>([
    {
      id: nanoid(10),
      name: 'Project-xyz',
      userId: users.value[0].id,
      startDate: new Date(2026, 0, 5),
      endDate: new Date(2026, 0, 13),
      durationDays: 5,
      bufferPercent: 25,
      color: '#7BA3D1',
      zIndex: 1
    },
    {
      id: nanoid(10),
      name: 'Proj-123',
      userId: users.value[1].id,
      startDate: new Date(2026, 0, 12),
      endDate: new Date(2026, 0, 20),
      durationDays: 5,
      bufferPercent: 10,
      color: '#F4C261',
      zIndex: 1
    }
  ])

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
    users.value = users.value.filter(u => u.id !== userId)
    projects.value = projects.value.filter(p => p.userId !== userId)
  }

  function addProject(project: Omit<Project, 'id' | 'endDate'>) {
    const endDate = calculateProjectEndDate(
      project.startDate,
      project.durationDays,
      project.bufferPercent
    )
    
    const newProject: Project = {
      ...project,
      id: nanoid(10),
      endDate,
      zIndex: project.zIndex ?? 1
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
        color: updates.color ?? currentProject.color,
        zIndex: updates.zIndex !== undefined ? updates.zIndex : currentProject.zIndex,
        endDate: currentProject.endDate
      }
      
      // Recalculate end date if duration, buffer, or start date changed
      if (updates.startDate || updates.durationDays !== undefined || updates.bufferPercent !== undefined) {
        updatedProject.endDate = calculateProjectEndDate(
          updatedProject.startDate,
          updatedProject.durationDays,
          updatedProject.bufferPercent
        )
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
          endDate: new Date(project.endDate)
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
