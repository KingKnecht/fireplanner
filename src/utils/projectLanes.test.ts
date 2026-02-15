import { describe, it, expect } from 'vitest'
import { assignProjectLanes, projectsOverlap, calculateProjectEndDate } from './projectUtils'
import type { Project } from '../types'

describe('projectLanes', () => {
  const createProject = (
    id: string,
    startDate: Date,
    durationDays: number,
    capacityPercent: number = 100
  ): Project => {
    const endDate = calculateProjectEndDate(startDate, durationDays, 0, capacityPercent)
    return {
      id,
      name: `Project ${id}`,
      userId: 'user1',
      startDate,
      endDate,
      durationDays,
      bufferPercent: 0,
      capacityPercent,
      color: '#FF0000',
      customProperties: {},
      zIndex: 0
    }
  }

  describe('projectsOverlap', () => {
    it('should detect overlapping projects', () => {
      const project1 = createProject('1', new Date(2026, 1, 10), 5)
      const project2 = createProject('2', new Date(2026, 1, 12), 5)
      
      expect(projectsOverlap(project1, project2)).toBe(true)
    })

    it('should detect non-overlapping projects', () => {
      const project1 = createProject('1', new Date(2026, 1, 10), 2)
      const project2 = createProject('2', new Date(2026, 1, 15), 2)
      
      expect(projectsOverlap(project1, project2)).toBe(false)
    })

    it('should handle projects that touch at boundary', () => {
      const project1 = createProject('1', new Date(2026, 1, 10), 3) // Mon-Wed
      const project2 = createProject('2', new Date(2026, 1, 13), 3) // Thu-Mon
      
      // They don't overlap since one ends when the other starts
      expect(projectsOverlap(project1, project2)).toBe(false)
    })
  })

  describe('assignProjectLanes', () => {
    it('should assign single project to lane 0', () => {
      const projects = [createProject('1', new Date(2026, 1, 10), 5)]
      const lanes = assignProjectLanes(projects)
      
      expect(lanes.get('1')).toEqual({ lane: 0, maxLanes: 1, offset: 0 })
    })

    it('should assign overlapping 100% projects to different lanes', () => {
      const projects = [
        createProject('1', new Date(2026, 1, 10), 5, 100),
        createProject('2', new Date(2026, 1, 12), 5, 100)
      ]
      const lanes = assignProjectLanes(projects)
      
      expect(lanes.get('1')).toEqual({ lane: 0, maxLanes: 2, offset: 0 })
      expect(lanes.get('2')).toEqual({ lane: 1, maxLanes: 2, offset: 0 })
    })

    it('should assign overlapping 50% projects to same lane', () => {
      const projects = [
        createProject('1', new Date(2026, 1, 10), 5, 50),
        createProject('2', new Date(2026, 1, 12), 5, 50)
      ]
      const lanes = assignProjectLanes(projects)
      
      expect(lanes.get('1')).toEqual({ lane: 0, maxLanes: 1, offset: 0 })
      expect(lanes.get('2')).toEqual({ lane: 0, maxLanes: 1, offset: 50 })
    })

    it('should handle three overlapping 33% projects in same lane', () => {
      const projects = [
        createProject('1', new Date(2026, 1, 10), 5, 33),
        createProject('2', new Date(2026, 1, 11), 5, 33),
        createProject('3', new Date(2026, 1, 12), 5, 33)
      ]
      const lanes = assignProjectLanes(projects)
      
      expect(lanes.get('1')).toEqual({ lane: 0, maxLanes: 1, offset: 0 })
      expect(lanes.get('2')).toEqual({ lane: 0, maxLanes: 1, offset: 33 })
      expect(lanes.get('3')).toEqual({ lane: 0, maxLanes: 1, offset: 66 })
    })

    it('should create new lane when capacity exceeded', () => {
      const projects = [
        createProject('1', new Date(2026, 1, 10), 5, 50),
        createProject('2', new Date(2026, 1, 11), 5, 50),
        createProject('3', new Date(2026, 1, 12), 5, 50) // Should go to lane 1
      ]
      const lanes = assignProjectLanes(projects)
      
      expect(lanes.get('1')).toEqual({ lane: 0, maxLanes: 2, offset: 0 })
      expect(lanes.get('2')).toEqual({ lane: 0, maxLanes: 2, offset: 50 })
      expect(lanes.get('3')).toEqual({ lane: 1, maxLanes: 2, offset: 0 })
    })

    it('should assign non-overlapping projects to same lane', () => {
      const projects = [
        createProject('1', new Date(2026, 1, 10), 2, 100),
        createProject('2', new Date(2026, 1, 20), 2, 100)
      ]
      const lanes = assignProjectLanes(projects)
      
      expect(lanes.get('1')).toEqual({ lane: 0, maxLanes: 1, offset: 0 })
      expect(lanes.get('2')).toEqual({ lane: 0, maxLanes: 1, offset: 0 })
    })

    it('should handle complex overlapping scenario', () => {
      // Project 1: 100% capacity, days 10-14
      // Project 2: 50% capacity, days 12-16 (overlaps with 1, needs new lane)
      // Project 3: 50% capacity, days 13-17 (overlaps with both, can share lane with 2)
      // Project 4: 100% capacity, days 18-22 (no overlap, can use lane 0)
      const projects = [
        createProject('1', new Date(2026, 1, 10), 5, 100),
        createProject('2', new Date(2026, 1, 12), 5, 50),
        createProject('3', new Date(2026, 1, 13), 5, 50),
        createProject('4', new Date(2026, 1, 18), 5, 100)
      ]
      const lanes = assignProjectLanes(projects)
      
      expect(lanes.get('1')?.lane).toBe(0)
      expect(lanes.get('2')?.lane).toBe(1)
      expect(lanes.get('3')?.lane).toBe(1)
      expect(lanes.get('3')?.offset).toBe(50)
      expect(lanes.get('4')?.lane).toBe(0) // Can reuse lane 0 since no overlap
    })
  })
})
