<template>
  <div ref="plannerGridRef" class="planner-grid">
    <div class="grid-header">
      <div class="date-column header-cell"></div>
      <div v-for="user in users" :key="user.id" class="user-column header-cell">
        {{ user.name }}
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
import { ref, onMounted } from 'vue'
import ProjectBlock from './ProjectBlock.vue'
import type { User, Project } from '../types'
import { formatDate } from '../utils/dateUtils'

const props = defineProps<{
  users: User[]
  weekdays: Date[]
  getProjectsForUser: (userId: string | null) => Project[]
  showUnassigned?: boolean
}>()

const emit = defineEmits<{
  createProject: [userId: string | null, startDate: Date]
  editProject: [project: Project]
  moveProject: [projectId: string, newUserId: string | null, newStartDate: Date]
}>()

const cellHeight = 40
const draggedProject = ref<Project | null>(null)
const dragOffsetX = ref(0)
const dragOffsetY = ref(0)
const plannerGridRef = ref<HTMLElement | null>(null)

function scrollToToday() {
  if (plannerGridRef.value && props.weekdays.length > 0) {
    const todayIndex = props.weekdays.findIndex(date => isToday(date))
    if (todayIndex !== -1) {
      // Center today's row in the viewport
      const scrollPosition = todayIndex * cellHeight - (plannerGridRef.value.clientHeight / 2) + cellHeight
      plannerGridRef.value.scrollTop = Math.max(0, scrollPosition)
    }
  }
}

onMounted(() => {
  // Scroll to today's date on mount
  scrollToToday()
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
  const cellIndex = Math.floor(relativeY / cellHeight)
  
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
}

.header-cell {
  padding: 16px;
  font-weight: 600;
  font-size: 16px;
  border-right: 1px solid #34495e;
  text-align: center;
}

.grid-body {
  display: flex;
  flex: 1;
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
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #bdc3c7;
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
}

.user-column {
  min-width: 200px;
  flex: 1;
  border-right: 1px solid #ddd;

.unassigned-header {
  background: #455a64 !important;
  font-style: italic;
}

.unassigned-column {
  background: #f9f9f9;
}
  position: relative;
}

.cell-container {
  position: relative;
  height: 100%;
}

.grid-cell {
  height: 40px;
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
