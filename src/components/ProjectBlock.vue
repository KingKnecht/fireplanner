<template>
  <div class="project-block" 
       draggable="true"
       :style="blockStyle"
       @click="handleClick"
       @dragstart="handleDragStart"
       @dragend="handleDragEnd">
    <div class="project-content">
      <div class="project-name">{{ project.name }}</div>
    </div>
    <span v-if="isSplitProject" class="split-label">(split)</span>
    <button 
      v-if="canSplit"
      class="split-button"
      @click.stop="handleSplit"
      title="Split project">
      ⚡
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import type { Project } from '../types'
import { isSameDay } from '../utils/dateUtils'

const props = defineProps<{
  project: Project
  weekdays: Date[]
  cellHeight: number
  isSelected?: boolean
  isRelatedSplit?: boolean
  lane?: number
  maxLanes?: number
  laneOffset?: number
}>()

const emit = defineEmits<{
  edit: [project: Project]
  delete: [project: Project]
  dragStart: [project: Project, offsetX: number, offsetY: number]
  dragEnd: []
  split: [project: Project]
}>()

const canSplit = computed(() => {
  return props.project.durationDays >= 1
})

const isSplitProject = computed(() => {
  // A project is a split if it has a parentProjectId (it's a child)
  // OR if it has originalDurationDays (it's been split into parts)
  return !!props.project.parentProjectId || !!props.project.originalDurationDays
})

const blockStyle = computed<CSSProperties>(() => {
  // Find the index of the project's start date in the weekdays array
  const topPosition = props.weekdays.findIndex(date => 
    isSameDay(date, props.project.startDate)
  )
  
  // If project start date is not in the visible weekdays, don't render
  if (topPosition === -1) {
    return {
      display: 'none'
    }
  }

  // Calculate height based on duration + buffer (supports half days)
  // Adjusted for capacity: at 50% capacity, a 10-day project takes 20 calendar days
  const totalDuration = props.project.durationDays * (1 + props.project.bufferPercent / 100)
  const adjustedDuration = totalDuration / (props.project.capacityPercent / 100)
  const roundedDuration = Math.ceil(adjustedDuration * 2) / 2
  const height = roundedDuration

  // Calculate left position based on lane offset
  const leftPosition = props.laneOffset !== undefined 
    ? `calc(${props.laneOffset}% + 2px)`
    : '2px'

  // Determine border and shadow based on selection and split relationship
  let border: string
  let boxShadow: string
  
  if (props.isSelected) {
    border = '3px solid #2196F3'
    boxShadow = '0 0 12px rgba(33, 150, 243, 0.5)'
  } else if (props.isRelatedSplit) {
    border = '2px solid #9C27B0'
    boxShadow = '0 0 8px rgba(156, 39, 176, 0.4)'
  } else {
    border = '2px solid rgba(0, 0, 0, 0.3)'
    boxShadow = 'none'
  }

  return {
    top: `${topPosition * props.cellHeight}px`,
    height: `${height * props.cellHeight - 4}px`,
    backgroundColor: props.project.color,
    position: 'absolute',
    left: leftPosition,
    width: `calc(${props.project.capacityPercent}% - 4px)`,
    border,
    borderRadius: '4px',
    padding: '8px',
    cursor: 'move',
    overflow: 'visible',
    opacity: '0.85',
    zIndex: props.project.zIndex,
    boxShadow
  }
})

function handleClick() {
  emit('edit', props.project)
}

function handleSplit() {
  emit('split', props.project)
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
  display: flex;
  flex-direction: column;
}

.project-block:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.project-block:active {
  cursor: grabbing;
  opacity: 0.7;
}

.project-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.project-name {
  font-weight: 600;
  font-size: 14px;
  text-align: center;
  color: #1a1a1a;
  user-select: none;
}

.split-button {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.1s;
  z-index: 10;
}

.split-button:hover {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.1);
}

.split-button:active {
  transform: scale(0.95);
}

.split-label {
  position: absolute;
  top: 4px;
  right: 32px;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  color: #9C27B0;
  user-select: none;
  pointer-events: none;
}
</style>
