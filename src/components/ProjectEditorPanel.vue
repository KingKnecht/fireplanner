<template>
  <div class="project-editor-panel">
    <div class="panel-header">
      <h3>{{ selectedProject ? 'Edit Project' : 'New Project' }}</h3>
      <button v-if="!selectedProject" @click="handleClear" class="btn-clear">Clear</button>
    </div>

    <div class="editor-form">
      <div class="form-group">
        <label>Project Name:</label>
        <input v-model="form.name" type="text" placeholder="Enter project name" />
      </div>

      <div class="form-group">
        <label>Assigned To:</label>
        <select v-model="form.userId">
          <option :value="null">Unassigned</option>
          <option v-for="user in users" :key="user.id" :value="user.id">
            {{ user.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>Duration (days):</label>
        <input 
          v-model.number="form.durationDays" 
          type="number" 
          step="0.5" 
          min="0.5" 
          placeholder="e.g. 4.5"
        />
      </div>

      <div class="form-group">
        <label>Buffer:</label>
        <select v-model.number="form.bufferPercent">
          <option :value="0">0%</option>
          <option :value="10">10%</option>
          <option :value="25">25%</option>
          <option :value="33">33%</option>
          <option :value="50">50%</option>
          <option :value="75">75%</option>
          <option :value="100">100%</option>
        </select>
      </div>

      <div class="form-group">
        <label>Start Date:</label>
        <DatePicker 
          v-model="form.startDate" 
          dateFormat="dd.mm.yy"
          showIcon
          :showOnFocus="false"
        />
      </div>

      <div class="form-group">
        <label>Color Palette:</label>
        <div class="color-palette">
          <div
            v-for="color in colorPalette"
            :key="color"
            class="color-swatch"
            :class="{ selected: form.color === color }"
            :style="{ backgroundColor: color }"
            @click="form.color = color"
          ></div>
        </div>
      </div>

      <div class="form-group">
        <label>Custom Color:</label>
        <input v-model="form.color" type="color" />
      </div>

      <div v-if="selectedProject" class="form-group">
        <label>Z-Order:</label>
        <button type="button" @click="sendToBack" class="btn-secondary">
          Send to Back
        </button>
      </div>

      <div class="form-actions">
        <button v-if="selectedProject" type="button" class="btn-delete" @click="handleDelete">
          Delete
        </button>
        <button v-if="!selectedProject" type="button" class="btn-primary" @click="handleCreate">
          Create
        </button>
      </div>

      <div v-if="calculatedEndDate" class="calculated-info">
        <p><strong>Calculated End Date:</strong> {{ formatDate(calculatedEndDate) }}</p>
        <p><strong>Total Duration:</strong> {{ totalDuration }} days</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import DatePicker from 'primevue/datepicker'
import type { User, Project } from '../types'
import { COLOR_PALETTE, calculateProjectEndDate } from '../utils/projectUtils'
import { formatDate } from '../utils/dateUtils'

const props = defineProps<{
  users: User[]
  selectedProject: Project | null
  newProjectData: { userId: string | null; startDate: Date } | null
}>()

const emit = defineEmits<{
  create: [data: {
    name: string
    userId: string | null
    startDate: Date
    durationDays: number
    bufferPercent: number
    color: string
    zIndex: number
  }]
  update: [projectId: string, data: Partial<{
    name: string
    userId: string | null
    startDate: Date
    durationDays: number
    bufferPercent: number
    color: string
    zIndex: number
  }>]
  updateZIndex: [projectId: string, zIndex: number]
  delete: []
  clear: []
}>()

const colorPalette = COLOR_PALETTE
const isUpdatingFromProject = ref(false)

const form = ref({
  name: '',
  userId: null as string | null,
  durationDays: 1,
  bufferPercent: 0,
  startDate: new Date() as Date | string,
  color: COLOR_PALETTE[0],
  zIndex: 1
})

const calculatedEndDate = computed(() => {
  if (!form.value.startDate || !form.value.durationDays) return null
  return calculateProjectEndDate(
    new Date(form.value.startDate),
    form.value.durationDays,
    form.value.bufferPercent
  )
})

const totalDuration = computed(() => {
  const base = form.value.durationDays
  const withBuffer = base * (1 + form.value.bufferPercent / 100)
  return Math.ceil(withBuffer * 2) / 2
})

// Watch selected project to populate form
watch(() => props.selectedProject, (project) => {
  if (project) {
    isUpdatingFromProject.value = true
    form.value = {
      name: project.name,
      userId: project.userId,
      durationDays: project.durationDays,
      bufferPercent: project.bufferPercent,
      startDate: new Date(project.startDate),
      color: project.color,
      zIndex: project.zIndex
    }
    // Use nextTick to ensure the form is updated before re-enabling the watch
    setTimeout(() => {
      isUpdatingFromProject.value = false
    }, 0)
  }
}, { immediate: true })

// Watch newProjectData to pre-fill form when double-clicking a cell
watch(() => props.newProjectData, (data) => {
  if (data && !props.selectedProject) {
    form.value = {
      name: '',
      userId: data.userId,
      durationDays: 1,
      bufferPercent: 0,
      startDate: new Date(data.startDate),
      color: COLOR_PALETTE[0],
      zIndex: 1
    }
  }
}, { immediate: true })

// Watch other form fields for live updates on existing projects
watch(() => [form.value.name, form.value.userId, form.value.durationDays, form.value.bufferPercent, form.value.startDate, form.value.color], () => {
  if (!props.selectedProject || !form.value.startDate || isUpdatingFromProject.value) return
  
  const updates: Partial<{
    name: string
    userId: string | null
    startDate: Date
    durationDays: number
    bufferPercent: number
    color: string
  }> = {}
  
  if (form.value.name !== props.selectedProject.name) updates.name = form.value.name
  if (form.value.userId !== props.selectedProject.userId) updates.userId = form.value.userId
  if (form.value.durationDays !== props.selectedProject.durationDays) updates.durationDays = form.value.durationDays
  if (form.value.bufferPercent !== props.selectedProject.bufferPercent) updates.bufferPercent = form.value.bufferPercent
  if (form.value.color !== props.selectedProject.color) updates.color = form.value.color
  
  const newStartDate = new Date(form.value.startDate)
  if (newStartDate.getTime() !== props.selectedProject.startDate.getTime()) {
    updates.startDate = newStartDate
  }
  
  if (Object.keys(updates).length > 0) {
    emit('update', props.selectedProject.id, updates)
  }
}, { deep: true })

function handleCreate() {
  if (!form.value.startDate) return
  
  emit('create', {
    name: form.value.name,
    userId: form.value.userId,
    startDate: new Date(form.value.startDate),
    durationDays: form.value.durationDays,
    bufferPercent: form.value.bufferPercent,
    color: (form.value.color || COLOR_PALETTE[0]) as string,
    zIndex: form.value.zIndex
  })
}

function handleDelete() {
  if (confirm('Are you sure you want to delete this project?')) {
    emit('delete')
  }
}

function sendToBack() {
  if (!props.selectedProject) return
  form.value.zIndex = 0
  emit('updateZIndex', props.selectedProject.id, 0)
}

function handleClear() {
  form.value = {
    name: '',
    userId: null,
    durationDays: 1,
    bufferPercent: 0,
    startDate: new Date(),
    color: COLOR_PALETTE[0],
    zIndex: 1
  }
  emit('clear')
}
</script>

<style scoped>
.project-editor-panel {
  width: 350px;
  background: white;
  border-left: 2px solid #ddd;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.panel-header {
  background: #2c3e50;
  color: white;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
}

.btn-clear {
  background: transparent;
  border: 1px solid white;
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.btn-clear:hover {
  background: rgba(255, 255, 255, 0.1);
}

.editor-form {
  padding: 20px;
  flex: 1;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group input[type="color"] {
  height: 40px;
  padding: 4px;
}

.color-palette {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
  margin-top: 8px;
}

.color-swatch {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 4px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.color-swatch:hover {
  transform: scale(1.1);
}

.color-swatch.selected {
  border-color: #2c3e50;
  box-shadow: 0 0 0 2px white, 0 0 0 4px #2c3e50;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 24px;
}

.btn-primary,
.btn-delete,
.btn-secondary {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background: #4CAF50;
  color: white;
}

.btn-primary:hover {
  background: #45a049;
}

.btn-secondary {
  background: #607D8B;
  color: white;
  width: 100%;
}

.btn-secondary:hover {
  background: #546E7A;
}

.btn-delete {
  background: #f44336;
  color: white;
}

.btn-delete:hover {
  background: #da190b;
}

.calculated-info {
  margin-top: 20px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 13px;
}

.calculated-info p {
  margin: 4px 0;
}

/* PrimeVue DatePicker styling */
:deep(.p-datepicker) {
  width: 100%;
}

:deep(.p-datepicker input) {
  width: 100%;
}
</style>
