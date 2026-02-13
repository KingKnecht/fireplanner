import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlannerStore } from './plannerStore'

describe('plannerStore', () => {
  beforeEach(() => {
    // Create a fresh pinia instance for each test
    setActivePinia(createPinia())
  })

  describe('initial state', () => {
    it('should start with empty users and projects', () => {
      const store = usePlannerStore()
      
      expect(store.users).toEqual([])
      expect(store.projects).toEqual([])
    })

    it('should have default date range for 2026', () => {
      const store = usePlannerStore()
      
      expect(store.startDate).toEqual(new Date(2026, 0, 1))
      expect(store.endDate).toEqual(new Date(2026, 11, 31))
    })

    it('should compute weekdays from date range', () => {
      const store = usePlannerStore()
      
      expect(store.weekdays.length).toBeGreaterThan(200) // ~260 work days in a year
      expect(store.weekdays.every(d => d.getDay() !== 0 && d.getDay() !== 6)).toBe(true)
    })
  })

  describe('addUser', () => {
    it('should add a user with generated id', () => {
      const store = usePlannerStore()
      
      store.addUser('Alice')
      
      expect(store.users).toHaveLength(1)
      expect(store.users[0]!.name).toBe('Alice')
      expect(store.users[0]!.id).toBeTruthy()
      expect(store.users[0]!.id.length).toBe(10) // nanoid(10)
    })

    it('should add user with custom color', () => {
      const store = usePlannerStore()
      
      store.addUser('Bob', '#FF0000')
      
      expect(store.users[0]!.color).toBe('#FF0000')
    })

    it('should generate random color if not provided', () => {
      const store = usePlannerStore()
      
      store.addUser('Charlie')
      
      expect(store.users[0]!.color).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('should add multiple users', () => {
      const store = usePlannerStore()
      
      store.addUser('Alice')
      store.addUser('Bob')
      store.addUser('Charlie')
      
      expect(store.users).toHaveLength(3)
      expect(store.users.map(u => u.name)).toEqual(['Alice', 'Bob', 'Charlie'])
    })
  })

  describe('removeUser', () => {
    it('should remove user from list', () => {
      const store = usePlannerStore()
      
      store.addUser('Alice')
      const userId = store.users[0]!.id
      
      store.removeUser(userId)
      
      expect(store.users).toHaveLength(0)
    })

    it('should move user projects to unassigned', () => {
      const store = usePlannerStore()
      
      store.addUser('Alice')
      const userId = store.users[0]!.id
      
      store.addProject({
        name: 'Project 1',
        userId,
        startDate: new Date(2026, 1, 16),
        durationDays: 5,
        bufferPercent: 0,
        capacityPercent: 100,
        color: '#FF0000',
        zIndex: 1
      })
      
      store.removeUser(userId)
      
      expect(store.projects).toHaveLength(1)
      expect(store.projects[0]!.userId).toBeNull()
    })

    it('should handle removing non-existent user', () => {
      const store = usePlannerStore()
      
      store.addUser('Alice')
      
      expect(() => store.removeUser('fake-id')).not.toThrow()
      expect(store.users).toHaveLength(1)
    })
  })

  describe('addProject', () => {
    it('should add project with generated id', () => {
      const store = usePlannerStore()
      
      const project = store.addProject({
        name: 'Test Project',
        userId: null,
        startDate: new Date(2026, 1, 16),
        durationDays: 5,
        bufferPercent: 0,
        capacityPercent: 100,
        color: '#FF0000',
        zIndex: 1
      })
      
      expect(store.projects).toHaveLength(1)
      expect(project.id).toBeTruthy()
      expect(project.id.length).toBe(10)
    })

    it('should calculate end date based on duration', () => {
      const store = usePlannerStore()
      
      const project = store.addProject({
        name: 'Test Project',
        userId: null,
        startDate: new Date(2026, 1, 16), // Monday
        durationDays: 5,
        bufferPercent: 0,
        capacityPercent: 100,
        color: '#FF0000',
        zIndex: 1
      })
      
      expect(project.endDate.getDate()).toBe(20) // Friday
    })

    it('should default zIndex to 1 if not provided', () => {
      const store = usePlannerStore()
      
      const project = store.addProject({
        name: 'Test Project',
        userId: null,
        startDate: new Date(2026, 1, 16),
        durationDays: 5,
        bufferPercent: 0,
        capacityPercent: 100,
        color: '#FF0000'
      })
      
      expect(project.zIndex).toBe(1)
    })
  })

  describe('updateProject', () => {
    it('should update project name', () => {
      const store = usePlannerStore()
      
      const project = store.addProject({
        name: 'Old Name',
        userId: null,
        startDate: new Date(2026, 1, 16),
        durationDays: 5,
        bufferPercent: 0,
        capacityPercent: 100,
        color: '#FF0000',
        zIndex: 1
      })
      
      store.updateProject(project.id, { name: 'New Name' })
      
      expect(store.projects[0]!.name).toBe('New Name')
    })

    it('should recalculate end date when duration changes', () => {
      const store = usePlannerStore()
      
      const project = store.addProject({
        name: 'Test',
        userId: null,
        startDate: new Date(2026, 1, 16), // Monday
        durationDays: 5,
        bufferPercent: 0,
        capacityPercent: 100,
        color: '#FF0000',
        zIndex: 1
      })
      
      const originalEndDate = project.endDate.getDate()
      
      store.updateProject(project.id, { durationDays: 10 })
      
      expect(store.projects[0]!.endDate.getDate()).not.toBe(originalEndDate)
    })

    it('should recalculate end date when start date changes', () => {
      const store = usePlannerStore()
      
      const project = store.addProject({
        name: 'Test',
        userId: null,
        startDate: new Date(2026, 1, 16), // Monday
        durationDays: 5,
        bufferPercent: 0,
        capacityPercent: 100,
        color: '#FF0000',
        zIndex: 1
      })
      
      store.updateProject(project.id, { startDate: new Date(2026, 1, 17) })
      
      expect(store.projects[0]!.startDate.getDate()).toBe(17)
      expect(store.projects[0]!.endDate.getDate()).toBe(23) // Tue 17 + 5 workdays = Mon 23 (skipping weekend)
    })

    it('should handle updating non-existent project', () => {
      const store = usePlannerStore()
      
      expect(() => store.updateProject('fake-id', { name: 'Test' })).not.toThrow()
    })

    it('should allow setting userId to null', () => {
      const store = usePlannerStore()
      
      store.addUser('Alice')
      const userId = store.users[0]!.id
      
      const project = store.addProject({
        name: 'Test',
        userId,
        startDate: new Date(2026, 1, 16),
        durationDays: 5,
        bufferPercent: 0,
        capacityPercent: 100,
        color: '#FF0000',
        zIndex: 1
      })
      
      store.updateProject(project.id, { userId: null })
      
      expect(store.projects[0]!.userId).toBeNull()
    })
  })

  describe('deleteProject', () => {
    it('should remove project from list', () => {
      const store = usePlannerStore()
      
      const project = store.addProject({
        name: 'Test',
        userId: null,
        startDate: new Date(2026, 1, 16),
        durationDays: 5,
        bufferPercent: 0,
        capacityPercent: 100,
        color: '#FF0000',
        zIndex: 1
      })
      
      store.deleteProject(project.id)
      
      expect(store.projects).toHaveLength(0)
    })

    it('should handle deleting non-existent project', () => {
      const store = usePlannerStore()
      
      expect(() => store.deleteProject('fake-id')).not.toThrow()
    })
  })

  describe('getProjectsForUser', () => {
    it('should return projects for specific user', () => {
      const store = usePlannerStore()
      
      store.addUser('Alice')
      store.addUser('Bob')
      
      const aliceId = store.users[0]!.id
      const bobId = store.users[1]!.id
      
      store.addProject({
        name: 'Alice Project 1',
        userId: aliceId,
        startDate: new Date(2026, 1, 16),
        durationDays: 5,
        bufferPercent: 0,
        capacityPercent: 100,
        color: '#FF0000',
        zIndex: 1
      })
      
      store.addProject({
        name: 'Bob Project',
        userId: bobId,
        startDate: new Date(2026, 1, 16),
        durationDays: 5,
        bufferPercent: 0,
        capacityPercent: 100,
        color: '#00FF00',
        zIndex: 1
      })
      
      store.addProject({
        name: 'Alice Project 2',
        userId: aliceId,
        startDate: new Date(2026, 1, 23),
        durationDays: 5,
        bufferPercent: 0,
        capacityPercent: 100,
        color: '#FF0000',
        zIndex: 1
      })
      
      const aliceProjects = store.getProjectsForUser(aliceId)
      
      expect(aliceProjects).toHaveLength(2)
      expect(aliceProjects.every(p => p.userId === aliceId)).toBe(true)
    })

    it('should return unassigned projects when userId is null', () => {
      const store = usePlannerStore()
      
      store.addProject({
        name: 'Unassigned',
        userId: null,
        startDate: new Date(2026, 1, 16),
        durationDays: 5,
        bufferPercent: 0,
        capacityPercent: 100,
        color: '#FF0000',
        zIndex: 1
      })
      
      const unassignedProjects = store.getProjectsForUser(null)
      
      expect(unassignedProjects).toHaveLength(1)
      expect(unassignedProjects[0]!.name).toBe('Unassigned')
    })

    it('should return empty array for user with no projects', () => {
      const store = usePlannerStore()
      
      const projects = store.getProjectsForUser('non-existent-id')
      
      expect(projects).toEqual([])
    })
  })
})
