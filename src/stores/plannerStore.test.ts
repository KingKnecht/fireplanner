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

  describe('splitProject', () => {
    it('should split a project by reducing duration by 1 day', () => {
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
      
      store.splitProject(project.id)
      
      expect(store.projects).toHaveLength(2)
      expect(store.projects[0]!.durationDays).toBe(4)
    })

    it('should create a new 1-day split project', () => {
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
      
      store.splitProject(project.id)
      
      const newSplit = store.projects[1]!
      expect(newSplit.durationDays).toBe(1)
      expect(newSplit.name).toBe('Test Project')
      expect(newSplit.color).toBe('#FF0000')
    })

    it('should place new split immediately after parent ends', () => {
      const store = usePlannerStore()
      
      const project = store.addProject({
        name: 'Test Project',
        userId: null,
        startDate: new Date(2026, 1, 16), // Monday
        durationDays: 3,
        bufferPercent: 0,
        capacityPercent: 100,
        color: '#FF0000',
        zIndex: 1
      })
      
      store.splitProject(project.id)
      
      const parentEndDate = store.projects[0]!.endDate
      const newSplitStartDate = store.projects[1]!.startDate
      
      // New split should start the day after parent ends
      const expectedStartDate = new Date(parentEndDate)
      expectedStartDate.setDate(expectedStartDate.getDate() + 1)
      
      expect(newSplitStartDate.getDate()).toBe(expectedStartDate.getDate())
    })

    it('should set parentProjectId on both projects', () => {
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
      
      store.splitProject(project.id)
      
      expect(store.projects[0]!.parentProjectId).toBe(project.id)
      expect(store.projects[1]!.parentProjectId).toBe(project.id)
    })

    it('should set originalDurationDays on both projects', () => {
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
      
      store.splitProject(project.id)
      
      expect(store.projects[0]!.originalDurationDays).toBe(5)
      expect(store.projects[1]!.originalDurationDays).toBe(5)
    })

    it('should not split if duration is less than 1 day', () => {
      const store = usePlannerStore()
      
      const project = store.addProject({
        name: 'Test Project',
        userId: null,
        startDate: new Date(2026, 1, 16),
        durationDays: 0.5,
        bufferPercent: 0,
        capacityPercent: 100,
        color: '#FF0000',
        zIndex: 1
      })
      
      store.splitProject(project.id)
      
      expect(store.projects).toHaveLength(1)
      expect(store.projects[0]!.durationDays).toBe(0.5)
    })

    it('should copy all properties from parent to split', () => {
      const store = usePlannerStore()
      
      store.addUser('Alice')
      const userId = store.users[0]!.id
      
      const project = store.addProject({
        name: 'Test Project',
        userId,
        startDate: new Date(2026, 1, 16),
        durationDays: 5,
        bufferPercent: 25,
        capacityPercent: 75,
        color: '#FF0000',
        zIndex: 3,
        customProperties: { priority: 'high' }
      })
      
      store.splitProject(project.id)
      
      const newSplit = store.projects[1]!
      expect(newSplit.userId).toBe(userId)
      expect(newSplit.bufferPercent).toBe(25)
      expect(newSplit.capacityPercent).toBe(75)
      expect(newSplit.zIndex).toBe(3)
      expect(newSplit.customProperties?.priority).toBe('high')
    })
    
    it('should synchronize name changes across all split projects', () => {
      const store = usePlannerStore()
      
      const project = store.addProject({
        name: 'Original Name',
        userId: null,
        startDate: new Date(2026, 1, 16),
        durationDays: 5,
        bufferPercent: 0,
        capacityPercent: 100,
        color: '#FF0000',
        zIndex: 1
      })
      
      store.splitProject(project.id)
      store.splitProject(project.id)
      
      // Update name on one split
      store.updateProject(project.id, { name: 'Updated Name' })
      
      // All splits should have the updated name
      expect(store.projects[0]!.name).toBe('Updated Name')
      expect(store.projects[1]!.name).toBe('Updated Name')
      expect(store.projects[2]!.name).toBe('Updated Name')
    })
    
    it('should synchronize color changes across all split projects', () => {
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
      
      store.splitProject(project.id)
      
      // Update color on one split
      store.updateProject(project.id, { color: '#00FF00' })
      
      // All splits should have the updated color
      expect(store.projects[0]!.color).toBe('#00FF00')
      expect(store.projects[1]!.color).toBe('#00FF00')
    })
    
    it('should NOT synchronize userId changes across split projects', () => {
      const store = usePlannerStore()
      
      store.addUser('Alice')
      store.addUser('Bob')
      const aliceId = store.users[0]!.id
      const bobId = store.users[1]!.id
      
      const project = store.addProject({
        name: 'Test',
        userId: aliceId,
        startDate: new Date(2026, 1, 16),
        durationDays: 5,
        bufferPercent: 0,
        capacityPercent: 100,
        color: '#FF0000',
        zIndex: 1
      })
      
      store.splitProject(project.id)
      
      // Move one split to Bob
      const splitId = store.projects[1]!.id
      store.updateProject(splitId, { userId: bobId })
      
      // Only the updated split should have Bob's ID
      expect(store.projects[0]!.userId).toBe(aliceId)
      expect(store.projects[1]!.userId).toBe(bobId)
    })
  })

  describe('getSplitProjects', () => {
    it('should return all related split projects', () => {
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
      
      store.splitProject(project.id)
      store.splitProject(project.id)
      
      const splits = store.getSplitProjects(project.id)
      
      expect(splits).toHaveLength(3) // Parent + 2 splits
    })

    it('should return just the project if not split', () => {
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
      
      const splits = store.getSplitProjects(project.id)
      
      expect(splits).toHaveLength(1)
      expect(splits[0]!.id).toBe(project.id)
    })
  })

  describe('deleteProject with split cleanup', () => {
    it('should convert parent to normal project when last split is deleted', () => {
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
      
      store.splitProject(project.id)
      
      // Now we have 2 projects (parent with 4 days + split with 1 day)
      expect(store.projects).toHaveLength(2)
      expect(store.projects[0]!.parentProjectId).toBe(project.id)
      
      // Delete the split
      const splitId = store.projects[1]!.id
      store.deleteProject(splitId)
      
      // Should have 1 project left, converted back to normal
      expect(store.projects).toHaveLength(1)
      expect(store.projects[0]!.parentProjectId).toBeUndefined()
      expect(store.projects[0]!.originalDurationDays).toBeUndefined()
      expect(store.projects[0]!.durationDays).toBe(5) // Restored to original duration
    })

    it('should not trigger cleanup if more than 2 splits remain', () => {
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
      
      store.splitProject(project.id)
      store.splitProject(project.id)
      
      // Now we have 3 projects
      expect(store.projects).toHaveLength(3)
      
      // Delete one split
      const splitId = store.projects[2]!.id
      store.deleteProject(splitId)
      
      // Should have 2 projects left, still marked as splits
      expect(store.projects).toHaveLength(2)
      expect(store.projects[0]!.parentProjectId).toBe(project.id)
      expect(store.projects[1]!.parentProjectId).toBe(project.id)
    })
  })
})
