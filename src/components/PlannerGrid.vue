<template>
  <div ref="plannerGridRef" class="planner-grid">
    <div class="grid-header">
      <div class="date-column header-cell">
        <div class="zoom-controls">
          <button @click="zoomOut" class="btn-zoom" title="Zoom out (Ctrl -)">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
          <button @click="zoomIn" class="btn-zoom" title="Zoom in (Ctrl +)">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
      <div v-for="user in users" :key="user.id" class="user-column header-cell">
        <span class="user-name">{{ user.name }}</span>
        <button 
          class="btn-delete-user" 
          @click="handleDeleteUser(user.id, user.name)"
          title="Delete user"
        >
          ×
        </button>
      </div>
      <div v-if="showUnassigned" class="user-column header-cell unassigned-header">
        Unassigned
      </div>
    </div>

    <div class="grid-body">
      <div class="date-column">
        <div v-for="date in weekdays" :key="date.getTime()" class="date-cell" :class="{ 'friday-cell': isFriday(date), 'today-cell': isToday(date) }">
          {{ formatDate(date) }}
        </div>
      </div>

      <div v-for="user in users" :key="user.id" class="user-column">
        <div 
          class="cell-container"
          :class="{ 'drop-zone-active': draggedProject !== null }"
          @dragover="handleDragOver"
          @drop="handleDrop($event, user.id)"
        >
          <div 
            v-for="date in weekdays" 
            :key="date.getTime()" 
            class="grid-cell" 
            :class="{ 'friday-cell': isFriday(date), 'today-cell': isToday(date) }"
            @dblclick="handleCellDoubleClick(user.id, date)"
          ></div>
          
          <ProjectBlock
            v-for="project in getProjectsForUser(user.id)"
            :key="project.id"
            :project="project"
            :start-date="weekdays[0] || new Date()"
            :cell-height="cellHeight"
            :is-selected="project.id === selectedProjectId"
            @edit="handleEditProject"
            @drag-start="handleProjectDragStart"
            @drag-end="handleProjectDragEnd"
          />
        </div>
      </div>

      <div v-if="showUnassigned" class="user-column unassigned-column">
        <div 
          class="cell-container"
          :class="{ 'drop-zone-active': draggedProject !== null }"
          @dragover="handleDragOver"
          @drop="handleDrop($event, null)"
        >
          <div 
            v-for="date in weekdays" 
            :key="date.getTime()" 
            class="grid-cell" 
            :class="{ 'friday-cell': isFriday(date), 'today-cell': isToday(date) }"
            @dblclick="handleCellDoubleClick(null, date)"
          ></div>
          
          <ProjectBlock
            v-for="project in getProjectsForUser(null)"
            :key="project.id"
            :project="project"
            :start-date="weekdays[0] || new Date()"
            :cell-height="cellHeight"
            :is-selected="project.id === selectedProjectId"
            @edit="handleEditProject"
            @drag-start="handleProjectDragStart"
            @drag-end="handleProjectDragEnd"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import ProjectBlock from './ProjectBlock.vue'
import type { User, Project } from '../types'
import { formatDate } from '../utils/dateUtils'

const props = defineProps<{
  users: User[]
  weekdays: Date[]
  getProjectsForUser: (userId: string | null) => Project[]
  showUnassigned?: boolean
  selectedProjectId?: string | null
}>()

const emit = defineEmits<{
  createProject: [userId: string | null, startDate: Date]
  editProject: [project: Project]
  moveProject: [projectId: string, newUserId: string | null, newStartDate: Date]
  deleteUser: [userId: string]
}>()

const BASE_CELL_HEIGHT = 40
const MIN_ZOOM = 0.5
const MAX_ZOOM = 2.5
const ZOOM_STEP = 0.1

const zoomLevel = ref(1)
const cellHeight = ref(BASE_CELL_HEIGHT)

const draggedProject = ref<Project | null>(null)
const dragOffsetX = ref(0)
const dragOffsetY = ref(0)

function zoomIn() {
  if (zoomLevel.value < MAX_ZOOM) {
    zoomLevel.value = Math.min(zoomLevel.value + ZOOM_STEP, MAX_ZOOM)
    cellHeight.value = Math.round(BASE_CELL_HEIGHT * zoomLevel.value)
    localStorage.setItem('plannerZoomLevel', zoomLevel.value.toString())
  }
}

function zoomOut() {
  if (zoomLevel.value > MIN_ZOOM) {
    zoomLevel.value = Math.max(zoomLevel.value - ZOOM_STEP, MIN_ZOOM)
    cellHeight.value = Math.round(BASE_CELL_HEIGHT * zoomLevel.value)
    localStorage.setItem('plannerZoomLevel', zoomLevel.value.toString())
  }
}

function handleZoomKeyboard(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey) {
    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      zoomIn()
    } else if (event.key === '-') {
      event.preventDefault()
      zoomOut()
    } else if (event.key === '0') {
      event.preventDefault()
      zoomLevel.value = 1
      cellHeight.value = BASE_CELL_HEIGHT
      localStorage.setItem('plannerZoomLevel', '1')
    }
  }
}

function handleDeleteUser(userId: string, userName: string) {
  if (confirm(`Delete user "${userName}"? All their projects will be moved to Unassigned.`)) {
    emit('deleteUser', userId)
  }
}
const plannerGridRef = ref<HTMLElement | null>(null)

function scrollToToday() {
  if (plannerGridRef.value && props.weekdays.length > 0) {
    const todayIndex = props.weekdays.findIndex(date => isToday(date))
    if (todayIndex !== -1) {
      // Center today's row in the viewport
      const scrollPosition = todayIndex * cellHeight.value - (plannerGridRef.value.clientHeight / 2) + cellHeight.value
      plannerGridRef.value.scrollTop = Math.max(0, scrollPosition)
    }
  }
}

onMounted(() => {
  // Load zoom level from localStorage
  const savedZoom = localStorage.getItem('plannerZoomLevel')
  if (savedZoom) {
    const zoom = parseFloat(savedZoom)
    if (zoom >= MIN_ZOOM && zoom <= MAX_ZOOM) {
      zoomLevel.value = zoom
      cellHeight.value = Math.round(BASE_CELL_HEIGHT * zoom)
    }
  }
  
  // Scroll to today's date on mount
  scrollToToday()
  
  // Add keyboard listener for zoom
  window.addEventListener('keydown', handleZoomKeyboard)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleZoomKeyboard)
})

defineExpose({
  scrollToToday
})

function isFriday(date: Date): boolean {
  return date.getDay() === 5
}

function isToday(date: Date): boolean {
  const today = new Date()
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear()
}

function handleCellDoubleClick(userId: string | null, date: Date) {
  emit('createProject', userId, date)
}

function handleEditProject(project: Project) {
  emit('editProject', project)
}

function handleProjectDragStart(project: Project, offsetX: number, offsetY: number) {
  draggedProject.value = project
  dragOffsetX.value = offsetX
  dragOffsetY.value = offsetY
}

function handleProjectDragEnd() {
  draggedProject.value = null
  dragOffsetX.value = 0
  dragOffsetY.value = 0
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function handleDrop(event: DragEvent, userId: string | null) {
  event.preventDefault()
  if (!draggedProject.value) return
  
  const container = event.currentTarget as HTMLElement
  const rect = container.getBoundingClientRect()
  
  // Calculate the top-left corner position of the dragged rectangle
  const topLeftY = event.clientY - dragOffsetY.value
  
  // Calculate which cell the top-left corner is over
  const relativeY = topLeftY - rect.top
  const cellIndex = Math.floor(relativeY / cellHeight.value)
  
  // Ensure the index is within bounds
  if (cellIndex >= 0 && cellIndex < props.weekdays.length && props.weekdays[cellIndex]) {
    const newStartDate = new Date(props.weekdays[cellIndex]!)
    const project = draggedProject.value
    
    // Calculate duration in weekdays
    let duration = 0
    const current = new Date(project.startDate)
    const end = new Date(project.endDate)
    while (current <= end) {
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        duration++
      }
      current.setDate(current.getDate() + 1)
    }
    
    emit('moveProject', project.id, userId, newStartDate)
    
    // Select the project in the editor after dropping
    emit('editProject', project)
  }
}
</script>

<style scoped>
.planner-grid {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  overflow: auto;
  background: #f5f5f5;
}

.grid-header {
  display: flex;
  background: #2c3e50;
  color: white;
  position: sticky;
  top: 0;
  z-index: 100;
  min-width: fit-content;
}

.header-cell {
  padding: 16px;
  font-weight: 600;
  font-size: 16px;
  border-right: 1px solid #34495e;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
}

.date-column.header-cell {
  background: #1a252f;
  padding: 8px;
}

.user-name {
  flex: 1;
}

.btn-delete-user {
  background: rgba(244, 67, 54, 0.8);
  color: white;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  padding: 0;
}

.btn-delete-user:hover {
  background: rgba(244, 67, 54, 1);
}

.grid-body {
  display: flex;
  min-width: fit-content;
}

.date-column {
  min-width: 120px;
  background: #ecf0f1;
  border-right: 2px solid #bdc3c7;
  position: sticky;
  left: 0;
  z-index: 10;
}

.date-cell {
  height: v-bind('cellHeight + "px"');
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #bdc3c7;
  font-size: v-bind('Math.max(10, Math.min(14, 14 * zoomLevel)) + "px"');
  font-weight: 500;
  color: #2c3e50;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  justify-content: center;
}

.btn-zoom {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  padding: 0;
  flex-shrink: 0;
}

.btn-zoom:hover {
  background: rgba(255, 255, 255, 0.25);
}

.btn-zoom:active {
  background: rgba(255, 255, 255, 0.35);
}

.btn-zoom svg {
  width: 14px;
  height: 14px;
}

.zoom-level {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.95);
  min-width: 32px;
  text-align: center;
  font-weight: 500;
  flex-shrink: 0;
}

.user-column {
  flex: 1;
  min-width: 200px;
  flex-shrink: 0;
  border-right: 1px solid #ddd;
  position: relative;
}

.unassigned-header {
  background: #455a64 !important;
  font-style: italic;
}

.unassigned-column {
  background: #f9f9f9;
}

.cell-container {
  position: relative;
  height: 100%;
}

.grid-cell {
  height: v-bind('cellHeight + "px"');
  border-bottom: 1px solid #e0e0e0;
  background: white;
  transition: background 0.2s;
}

.user-column:hover .grid-cell {
  background: #f9f9f9;
}

.friday-cell {
  border-bottom: 3px solid #95a5a6 !important;
}

.today-cell {
  background: #fffacd !important;
}

.drop-zone-active {
  background: rgba(76, 175, 80, 0.05);
}

.drop-zone-active .grid-cell {
  transition: background 0.15s;
}
</style>
