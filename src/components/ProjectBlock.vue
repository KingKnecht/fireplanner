<template>
  <div class="project-block" 
       draggable="true"
       :style="blockStyle"
       @click="handleClick"
       @dragstart="handleDragStart"
       @dragend="handleDragEnd">
    <div class="project-name">{{ project.name }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import type { Project } from '../types'
import { isSameDay } from '../utils/dateUtils'

const props = defineProps<{
  project: Project
  startDate: Date
  cellHeight: number
  isSelected?: boolean
}>()

const emit = defineEmits<{
  edit: [project: Project]
  delete: [project: Project]
  dragStart: [project: Project, offsetX: number, offsetY: number]
  dragEnd: []
}>()

const blockStyle = computed<CSSProperties>(() => {
  // Calculate position
  let topPosition = 0
  const currentDate = new Date(props.startDate)
  
  while (!isSameDay(currentDate, props.project.startDate)) {
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      topPosition++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Calculate height based on duration + buffer (supports half days)
  // Adjusted for capacity: at 50% capacity, a 10-day project takes 20 calendar days
  const totalDuration = props.project.durationDays * (1 + props.project.bufferPercent / 100)
  const adjustedDuration = totalDuration / (props.project.capacityPercent / 100)
  const roundedDuration = Math.ceil(adjustedDuration * 2) / 2
  const height = roundedDuration

  return {
    top: `${topPosition * props.cellHeight}px`,
    height: `${height * props.cellHeight - 4}px`,
    backgroundColor: props.project.color,
    position: 'absolute',
    left: '2px',
    width: `calc(${props.project.capacityPercent}% - 4px)`,
    border: props.isSelected ? '3px solid #2196F3' : '2px solid rgba(0, 0, 0, 0.3)',
    borderRadius: '4px',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'move',
    overflow: 'hidden',
    opacity: '0.85',
    zIndex: props.project.zIndex,
    boxShadow: props.isSelected ? '0 0 12px rgba(33, 150, 243, 0.5)' : 'none'
  }
})

function handleClick() {
  emit('edit', props.project)
}

// function handleEdit() {
//   emit('edit', props.project)
// }

function handleDragStart(event: DragEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const offsetX = event.clientX - rect.left
  const offsetY = event.clientY - rect.top
  
  emit('dragStart', props.project, offsetX, offsetY)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', props.project.id)
  }
}

function handleDragEnd() {
  emit('dragEnd')
}
</script>

<style scoped>
.project-block {
  transition: box-shadow 0.2s, opacity 0.2s, border 0.2s;
}

.project-block:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.project-block:active {
  cursor: grabbing;
  opacity: 0.7;
}

.project-name {
  font-weight: 600;
  font-size: 14px;
  text-align: center;
  color: #1a1a1a;
  user-select: none;
}
</style>
