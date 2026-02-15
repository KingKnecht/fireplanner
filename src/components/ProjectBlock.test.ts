import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ProjectBlock from './ProjectBlock.vue'
import type { Project } from '../types'
import { getWeekdaysBetween } from '../utils/dateUtils'

describe('ProjectBlock.vue', () => {
  const mockProject: Project = {
    id: 'test-id',
    name: 'Test Project',
    userId: 'user-1',
    startDate: new Date(2026, 1, 16), // Monday, Feb 16
    endDate: new Date(2026, 1, 20),   // Friday, Feb 20
    durationDays: 5,
    bufferPercent: 0,
    capacityPercent: 100,
    color: '#FF0000',
    zIndex: 1
  }
  
  const weekdays = getWeekdaysBetween(
    new Date(2026, 1, 16), 
    new Date(2026, 1, 27), 
    [1, 2, 3, 4, 5] // Mon-Fri
  )

  const defaultProps = {
    project: mockProject,
    weekdays: weekdays,
    cellHeight: 40,
    isSelected: false
  }

  describe('rendering', () => {
    it('should render project name', () => {
      const wrapper = mount(ProjectBlock, { props: defaultProps })
      
      expect(wrapper.find('.project-name').text()).toBe('Test Project')
    })

    it('should apply project color as background', () => {
      const wrapper = mount(ProjectBlock, { props: defaultProps })
      const blockEl = wrapper.find('.project-block')
      
      expect((blockEl.element as HTMLElement).style.backgroundColor).toBe('#FF0000')
    })

    it('should be draggable', () => {
      const wrapper = mount(ProjectBlock, { props: defaultProps })
      const blockEl = wrapper.find('.project-block')
      
      expect(blockEl.attributes('draggable')).toBe('true')
    })
  })

  describe('selection styling', () => {
    it('should show blue border when selected', () => {
      const wrapper = mount(ProjectBlock, {
        props: { ...defaultProps, isSelected: true }
      })
      const blockEl = wrapper.find('.project-block')
      
      expect((blockEl.element as HTMLElement).style.border).toContain('3px solid')
      expect((blockEl.element as HTMLElement).style.border).toContain('#2196F3')
    })

    it('should show glow effect when selected', () => {
      const wrapper = mount(ProjectBlock, {
        props: { ...defaultProps, isSelected: true }
      })
      const blockEl = wrapper.find('.project-block')
      
      expect((blockEl.element as HTMLElement).style.boxShadow).not.toBe('none')
    })

    it('should have default border when not selected', () => {
      const wrapper = mount(ProjectBlock, {
        props: { ...defaultProps, isSelected: false }
      })
      const blockEl = wrapper.find('.project-block')
      
      expect((blockEl.element as HTMLElement).style.border).toContain('2px solid')
    })
  })

  describe('positioning and sizing', () => {
    it('should calculate height based on duration and cell height', () => {
      const wrapper = mount(ProjectBlock, { props: defaultProps })
      const blockEl = wrapper.find('.project-block')
      
      // 5 days * 40px - 4px margin = 196px
      expect((blockEl.element as HTMLElement).style.height).toBe('196px')
    })

    it('should adjust width based on capacity percent', () => {
      const halfCapacityProject = { ...mockProject, capacityPercent: 50 }
      const wrapper = mount(ProjectBlock, {
        props: { ...defaultProps, project: halfCapacityProject }
      })
      const blockEl = wrapper.find('.project-block')
      
      expect((blockEl.element as HTMLElement).style.width).toContain('50%')
    })

    it('should position at top when start date matches', () => {
      const wrapper = mount(ProjectBlock, { props: defaultProps })
      const blockEl = wrapper.find('.project-block')
      
      expect((blockEl.element as HTMLElement).style.top).toBe('0px')
    })

    it('should offset position for later start date', () => {
      const laterProject = {
        ...mockProject,
        startDate: new Date(2026, 1, 17) // Tuesday, one day later
      }
      const wrapper = mount(ProjectBlock, {
        props: { ...defaultProps, project: laterProject }
      })
      const blockEl = wrapper.find('.project-block')
      
      expect((blockEl.element as HTMLElement).style.top).toBe('40px') // 1 day * 40px
    })
  })

  describe('interactions', () => {
    it('should emit edit event on click', async () => {
      const wrapper = mount(ProjectBlock, { props: defaultProps })
      
      await wrapper.find('.project-block').trigger('click')
      
      expect(wrapper.emitted('edit')).toBeTruthy()
      expect(wrapper.emitted('edit')![0]).toEqual([mockProject])
    })

    it('should emit dragStart with offset on drag start', async () => {
      const wrapper = mount(ProjectBlock, { props: defaultProps })
      const blockEl = wrapper.find('.project-block')
      
      // Mock getBoundingClientRect
      vi.spyOn(blockEl.element, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        top: 50,
        right: 200,
        bottom: 250,
        width: 100,
        height: 200,
        x: 100,
        y: 50,
        toJSON: () => {}
      } as DOMRect)
      
      await blockEl.trigger('dragstart', {
        clientX: 150,
        clientY: 150,
        dataTransfer: {
          effectAllowed: '',
          setData: vi.fn()
        }
      })
      
      expect(wrapper.emitted('dragStart')).toBeTruthy()
      const emittedData = wrapper.emitted('dragStart')![0]!
      expect(emittedData[0]).toEqual(mockProject)
      expect(emittedData[1]).toBe(50) // offsetX: 150 - 100
      expect(emittedData[2]).toBe(100) // offsetY: 150 - 50
    })

    it('should emit dragEnd on drag end', async () => {
      const wrapper = mount(ProjectBlock, { props: defaultProps })
      
      await wrapper.find('.project-block').trigger('dragend')
      
      expect(wrapper.emitted('dragEnd')).toBeTruthy()
    })
  })

  describe('buffer and capacity adjustments', () => {
    it('should increase height with buffer percentage', () => {
      const bufferedProject = { ...mockProject, bufferPercent: 20 }
      const wrapper = mount(ProjectBlock, {
        props: { ...defaultProps, project: bufferedProject }
      })
      const blockEl = wrapper.find('.project-block')
      
      // 5 days + 20% buffer = 6 days → 236px
      expect((blockEl.element as HTMLElement).style.height).toBe('236px')
    })

    it('should increase height with reduced capacity', () => {
      const reducedCapacityProject = { ...mockProject, capacityPercent: 50 }
      const wrapper = mount(ProjectBlock, {
        props: { ...defaultProps, project: reducedCapacityProject }
      })
      const blockEl = wrapper.find('.project-block')
      
      // 5 days at 50% capacity = 10 days → 396px
      expect((blockEl.element as HTMLElement).style.height).toBe('396px')
    })
  })
})
