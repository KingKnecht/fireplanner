<template>
  <div class="project-editor-panel">
    <div class="panel-header">
      <h3>{{ selectedProject ? 'Edit Project' : 'New Project' }}</h3>
      <button v-if="!selectedProject" @click="handleClear" class="btn-clear">Clear</button>
    </div>

    <!-- Split Project Summary at Top -->
    <div v-if="isSplitProject" class="split-summary-top" :class="{ 'duration-mismatch': hasDurationMismatch }">
      <p class="split-label">Split Project Summary</p>
      <p><strong>All Splits Duration:</strong> {{ totalSplitDuration }} / {{ originalDuration }} days</p>
      <p><strong>This Block Duration:</strong> {{ form.durationDays }} / {{ originalDuration }} days</p>
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
        <label>Duration (days, max 300):</label>
        <input 
          v-model.number="form.durationDays" 
          type="number" 
          step="0.5" 
          min="0.5" 
          max="300"
          placeholder="e.g. 4.5"
        />
      </div>

      <div v-if="isSplitProject" class="form-group">
        <label>Overall Duration (days, for summary):</label>
        <input 
          v-model.number="form.overallDurationDays" 
          type="number" 
          step="0.5" 
          min="0.5" 
          max="300"
          placeholder="e.g. 10"
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
        <label>Capacity:</label>
        <div class="capacity-input-group">
          <input 
            v-model.number="form.capacityPercent" 
            type="number" 
            min="1" 
            max="100" 
            step="1"
          />
          <span class="percentage-symbol">%</span>
        </div>
        <div class="capacity-presets">
          <button 
            v-for="preset in [20, 25, 33, 50, 75, 100]" 
            :key="preset"
            type="button"
            class="preset-button"
            :class="{ active: form.capacityPercent === preset }"
            @click="form.capacityPercent = preset"
          >
            {{ preset }}%
          </button>
        </div>
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

      <!-- Custom Properties Section -->
      <div v-if="customPropertyDefinitions.length > 0" class="custom-properties-section">
        <div class="collapsible-header" @click="customPropertiesExpanded = !customPropertiesExpanded">
          <h4>Custom Properties</h4>
          <span class="expand-icon">{{ customPropertiesExpanded ? '▼' : '▶' }}</span>
        </div>
        <div v-if="customPropertiesExpanded" class="custom-properties-content">
          <div v-for="propDef in customPropertyDefinitions" :key="propDef.name" class="form-group">
          <label>
            {{ propDef.name }}:
            <span v-if="propDef.required" class="required-indicator">*</span>
          </label>
          
          <!-- String input -->
          <input
            v-if="propDef.type === 'string'"
            v-model="form.customProperties[propDef.name]"
            type="text"
            :placeholder="`Enter ${propDef.name}`"
            :class="{ 'invalid-field': isPropertyInvalid(propDef.name) }"
          />
          
          <!-- Number input -->
          <input
            v-else-if="propDef.type === 'number'"
            v-model.number="form.customProperties[propDef.name]"
            type="number"
            step="1"
            :placeholder="`Enter ${propDef.name}`"
            :class="{ 'invalid-field': isPropertyInvalid(propDef.name) }"
          />
          
          <!-- Float input -->
          <input
            v-else-if="propDef.type === 'float'"
            v-model.number="form.customProperties[propDef.name]"
            type="number"
            step="any"
            :placeholder="`Enter ${propDef.name}`"
            :class="{ 'invalid-field': isPropertyInvalid(propDef.name) }"
          />
          
          <!-- Boolean input -->
          <div v-else-if="propDef.type === 'boolean'" class="boolean-input">
            <input
              :id="`prop-${propDef.name}`"
              v-model="form.customProperties[propDef.name]"
              type="checkbox"
            />
            <label :for="`prop-${propDef.name}`" class="checkbox-label">
              {{ form.customProperties[propDef.name] ? 'Yes' : 'No' }}
            </label>
          </div>
          
          <!-- Date input -->
          <DatePicker
            v-else-if="propDef.type === 'Date'"
            v-model="(form.customProperties[propDef.name] as Date | null)"
            dateFormat="dd.mm.yy"
            showIcon
            :showOnFocus="false"
            :class="{ 'invalid-field': isPropertyInvalid(propDef.name) }"
          />
        </div>
        </div>
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
        <button 
          v-if="!selectedProject" 
          type="button" 
          class="btn-primary" 
          @click="handleCreate"
          :disabled="!canCreate"
          :title="!canCreate ? 'Please fill in all required fields' : ''"
        >
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
import { ref, watch, computed, nextTick } from 'vue'
import DatePicker from 'primevue/datepicker'
import type { User, Project, CustomPropertyDefinition } from '../types'
import { COLOR_PALETTE, calculateProjectEndDate } from '../utils/projectUtils'
import { formatDate, isWorkingDay } from '../utils/dateUtils'
import { usePlannerStore } from '../stores/plannerStore'

const props = defineProps<{
  users: User[]
  selectedProject: Project | null
  newProjectData: { userId: string | null; startDate: Date } | null
  customPropertyDefinitions: CustomPropertyDefinition[]
  workingDays: number[]
}>()

const emit = defineEmits<{
  create: [data: {
    name: string
    userId: string | null
    startDate: Date
    durationDays: number
    bufferPercent: number
    capacityPercent: number
    color: string
    zIndex: number
    customProperties?: Record<string, string | number | boolean | Date | null>
  }]
  update: [projectId: string, data: Partial<{
    name: string
    userId: string | null
    startDate: Date
    durationDays: number
    bufferPercent: number
    capacityPercent: number
    color: string
    zIndex: number
    customProperties: Record<string, string | number | boolean | Date | null>
    overallDurationDays: number
  }>]
  updateZIndex: [projectId: string, zIndex: number]
  delete: []
  clear: []
}>()

const colorPalette = COLOR_PALETTE
const isUpdatingFromProject = ref(false)
const store = usePlannerStore()
const customPropertiesExpanded = ref(false)

// Helper to initialize custom properties with default values
function initializeCustomProperties(): Record<string, string | number | boolean | Date | null> {
  const customProps: Record<string, string | number | boolean | Date | null> = {}
  for (const propDef of props.customPropertyDefinitions) {
    switch (propDef.type) {
      case 'string':
        customProps[propDef.name] = ''
        break
      case 'number':
      case 'float':
        customProps[propDef.name] = null
        break
      case 'boolean':
        customProps[propDef.name] = false
        break
      case 'Date':
        customProps[propDef.name] = null
        break
    }
  }
  return customProps
}

// Helper to get a valid working day as default start date
const defaultStartDate = computed(() => {
  const today = new Date()
  
  // If today is a working day, use it
  if (isWorkingDay(today, store.workingDays)) {
    return today
  }
  
  // Otherwise find the next working day
  const nextDay = new Date(today)
  for (let i = 1; i <= 7; i++) {
    nextDay.setDate(nextDay.getDate() + 1)
    if (isWorkingDay(nextDay, store.workingDays)) {
      return new Date(nextDay)
    }
  }
  
  // Fallback to today if no working day found in next week
  return today
})

const form = ref({
  name: '',
  userId: null as string | null,
  durationDays: 1,
  bufferPercent: 0,
  capacityPercent: 100,
  startDate: new Date(),
  color: COLOR_PALETTE[0],
  zIndex: 1,
  customProperties: {} as Record<string, string | number | boolean | Date | null>,
  overallDurationDays: undefined as number | undefined
})

// Clamp duration to reasonable maximum to prevent performance issues
watch(() => form.value.durationDays, (newDuration) => {
  if (newDuration > 300) {
    form.value.durationDays = 300
  } else if (newDuration < 0.5) {
    form.value.durationDays = 0.5
  }
})

// Update form start date when working days change and no project is selected
watch(() => store.workingDays, () => {
  if (!props.selectedProject && !props.newProjectData) {
    form.value.startDate = new Date(defaultStartDate.value)
  }
})

// Clamp overall duration to reasonable maximum
watch(() => form.value.overallDurationDays, (newDuration) => {
  if (newDuration !== undefined && newDuration > 300) {
    form.value.overallDurationDays = 300
  } else if (newDuration !== undefined && newDuration < 0.5) {
    form.value.overallDurationDays = 0.5
  }
})

// Initialize custom properties when definitions load
watch(() => props.customPropertyDefinitions, () => {
  // Only initialize if form is empty (new project mode)
  if (!props.selectedProject && Object.keys(form.value.customProperties).length === 0) {
    form.value.customProperties = initializeCustomProperties()
  }
}, { immediate: true })

const calculatedEndDate = computed(() => {
  if (!form.value.startDate || !form.value.durationDays) return null
  return calculateProjectEndDate(
    new Date(form.value.startDate),
    form.value.durationDays,
    form.value.bufferPercent,
    form.value.capacityPercent,
    props.workingDays
  )
})

const totalDuration = computed(() => {
  const base = form.value.durationDays
  const withBuffer = base * (1 + form.value.bufferPercent / 100)
  const withCapacity = withBuffer / (form.value.capacityPercent / 100)
  return Math.ceil(withCapacity * 2) / 2
})

// Split project information
const isSplitProject = computed(() => {
  if (!props.selectedProject) return false
  return !!props.selectedProject.parentProjectId || 
    (props.selectedProject.originalDurationDays !== undefined && 
     props.selectedProject.originalDurationDays > props.selectedProject.durationDays)
})

const totalSplitDuration = computed(() => {
  if (!props.selectedProject || !isSplitProject.value) return 0
  
  const parentId = props.selectedProject.parentProjectId || props.selectedProject.id
  const splits = store.getSplitProjects(parentId)
  
  return splits.reduce((sum, p) => sum + p.durationDays, 0)
})

const originalDuration = computed(() => {
  if (!props.selectedProject) return 0
  return props.selectedProject.overallDurationDays || props.selectedProject.originalDurationDays || props.selectedProject.durationDays
})

const hasDurationMismatch = computed(() => {
  if (!isSplitProject.value) return false
  return totalSplitDuration.value !== originalDuration.value
})

// Validation for required custom properties
const missingRequiredProperties = computed(() => {
  const missing: string[] = []
  if (!props.customPropertyDefinitions) return missing
  
  for (const propDef of props.customPropertyDefinitions) {
    if (propDef.required) {
      const value = form.value.customProperties[propDef.name]
      // Check if value is missing, null, undefined, or empty string
      if (value === null || value === undefined || value === '') {
        missing.push(propDef.name)
      }
    }
  }
  return missing
})

const canCreate = computed(() => {
  // Don't block if no name is entered - let the user create unnamed projects
  return missingRequiredProperties.value.length === 0
})

function isPropertyInvalid(propName: string): boolean {
  return missingRequiredProperties.value.includes(propName)
}

// Watch selected project to populate form
watch(() => props.selectedProject, (project) => {
  if (project) {
    isUpdatingFromProject.value = true
    // Merge existing custom properties with initialized ones
    const initializedProps = initializeCustomProperties()
    const mergedProps = { ...initializedProps, ...(project.customProperties || {}) }
    
    form.value = {
      name: project.name,
      userId: project.userId,
      durationDays: project.durationDays,
      bufferPercent: project.bufferPercent,
      capacityPercent: project.capacityPercent,
      startDate: new Date(project.startDate),
      color: project.color,
      zIndex: project.zIndex,
      customProperties: mergedProps,
      overallDurationDays: project.overallDurationDays
    }
    nextTick(() => {
      isUpdatingFromProject.value = false
    })
  } else {
    // No project selected - reset to default values with working day
    isUpdatingFromProject.value = true
    const defaultDate = new Date(defaultStartDate.value)
    form.value = {
      name: '',
      userId: null,
      durationDays: 1,
      bufferPercent: 0,
      capacityPercent: 100,
      startDate: defaultDate,
      color: COLOR_PALETTE[0],
      zIndex: 1,
      customProperties: initializeCustomProperties(),
      overallDurationDays: undefined
    }
    nextTick(() => {
      isUpdatingFromProject.value = false
    })
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
      capacityPercent: 100,
      startDate: new Date(data.startDate),
      color: COLOR_PALETTE[0],
      zIndex: 1,
      customProperties: initializeCustomProperties(),
      overallDurationDays: undefined
    }
  }
}, { immediate: true })

// Watch other form fields for live updates on existing projects
watch(() => [form.value.name, form.value.userId, form.value.durationDays, form.value.bufferPercent, form.value.capacityPercent, form.value.startDate, form.value.color, form.value.customProperties, form.value.overallDurationDays], () => {
  if (!props.selectedProject || !form.value.startDate || isUpdatingFromProject.value) return
  
  const updates: Partial<{
    name: string
    userId: string | null
    startDate: Date
    durationDays: number
    bufferPercent: number
    capacityPercent: number
    color: string
    customProperties: Record<string, string | number | boolean | Date | null>
    overallDurationDays: number | undefined
  }> = {}
  
  if (form.value.name !== props.selectedProject.name) updates.name = form.value.name
  if (form.value.userId !== props.selectedProject.userId) updates.userId = form.value.userId
  if (form.value.durationDays !== props.selectedProject.durationDays) updates.durationDays = form.value.durationDays
  if (form.value.bufferPercent !== props.selectedProject.bufferPercent) updates.bufferPercent = form.value.bufferPercent
  if (form.value.capacityPercent !== props.selectedProject.capacityPercent) updates.capacityPercent = form.value.capacityPercent
  if (form.value.color !== props.selectedProject.color) updates.color = form.value.color
  if (form.value.overallDurationDays !== props.selectedProject.overallDurationDays) updates.overallDurationDays = form.value.overallDurationDays
  
  // Check if custom properties changed
  const currentCustomProps = JSON.stringify(props.selectedProject.customProperties || {})
  const newCustomProps = JSON.stringify(form.value.customProperties)
  if (currentCustomProps !== newCustomProps) {
    updates.customProperties = form.value.customProperties
  }
  
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
  
  // Validate required custom properties
  if (missingRequiredProperties.value.length > 0) {
    alert(`Please fill in required properties: ${missingRequiredProperties.value.join(', ')}`)
    return
  }
  
  emit('create', {
    name: form.value.name,
    userId: form.value.userId,
    startDate: new Date(form.value.startDate),
    durationDays: form.value.durationDays,
    bufferPercent: form.value.bufferPercent,
    capacityPercent: form.value.capacityPercent,
    color: (form.value.color || COLOR_PALETTE[0]) as string,
    zIndex: form.value.zIndex,
    customProperties: form.value.customProperties
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
    capacityPercent: 100,
    startDate: new Date(defaultStartDate.value),
    color: COLOR_PALETTE[0],
    zIndex: 1,
    customProperties: initializeCustomProperties(),
    overallDurationDays: undefined
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
.split-summary-top {
  padding: 12px 16px;
  margin: 0 0 16px 0;
  background: #E3F2FD;
  border-left: 4px solid #2196F3;
  border-radius: 4px;
  font-size: 13px;
}

.split-summary-top.duration-mismatch {
  background: #FFF3E0;
  border-left-color: #FF9800;
}

.split-summary-top p {
  margin: 4px 0;
}

.split-summary-top .split-label {
  color: #1976D2;
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
}

.split-summary-top.duration-mismatch .split-label {
  color: #F57C00;
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

.capacity-input-group {
  position: relative;
  display: flex;
  align-items: center;
}

.capacity-input-group input[type="number"] {
  flex: 1;
  padding-right: 30px;
}

.percentage-symbol {
  position: absolute;
  right: 10px;
  color: #666;
  pointer-events: none;
}

.capacity-presets {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.preset-button {
  padding: 4px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.preset-button:hover {
  background: #f0f0f0;
  border-color: #999;
}

.preset-button.active {
  background: #2c3e50;
  color: white;
  border-color: #2c3e50;
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

.btn-primary:hover:not(:disabled) {
  background: #45a049;
}

.btn-primary:disabled {
  background: #cccccc;
  color: #666666;
  cursor: not-allowed;
  opacity: 0.6;
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

.split-summary {
  margin-top: 12px;
}

.split-summary .divider {
  border: none;
  border-top: 1px solid #ddd;
  margin: 8px 0;
}

.split-summary .split-label {
  color: #2196F3;
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
}

.custom-properties-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #ddd;
}

.collapsible-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  padding: 8px 0;
  margin-bottom: 0;
}

.collapsible-header:hover {
  opacity: 0.7;
}

.collapsible-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.expand-icon {
  font-size: 12px;
  color: #666;
  transition: transform 0.2s;
}

.custom-properties-content {
  margin-top: 16px;
}

.required-indicator {
  color: #f44336;
  margin-left: 4px;
}

.boolean-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.boolean-input input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

.checkbox-label {
  margin: 0;
  font-weight: normal;
  cursor: pointer;
}

.invalid-field {
  border-color: #f44336 !important;
  background-color: #ffebee !important;
}

/* PrimeVue DatePicker styling */
:deep(.p-datepicker) {
  width: 100%;
}

:deep(.p-datepicker input) {
  width: 100%;
}

</style>

<style>
/* Dark mode styles - non-scoped */
.dark-mode .project-editor-panel {
  background: #1a1a1a;
  border-left: 2px solid #2a2a2a;
}

.dark-mode .panel-header {
  background: #0d0d0d;
}

.dark-mode .btn-clear {
  border-color: #666;
}

.dark-mode .btn-clear:hover {
  background: rgba(255, 255, 255, 0.1);
}

.dark-mode .form-group label {
  color: #b0b0b0;
}

.dark-mode .form-group input,
.dark-mode .form-group select {
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  color: #e0e0e0;
}

.dark-mode .form-group input:focus,
.dark-mode .form-group select:focus {
  border-color: #4CAF50;
  background: #2a2a2a;
}

.dark-mode .calculated-info {
  background: #2a2a2a;
  color: #b0b0b0;
}

.dark-mode .split-summary .divider {
  border-top-color: #3a3a3a;
}

.dark-mode .split-summary .split-label {
  color: #42A5F5;
}

.dark-mode .split-summary-top {
  background: #1E3A5F;
  border-left-color: #42A5F5;
}

.dark-mode .split-summary-top.duration-mismatch {
  background: #3E2723;
  border-left-color: #FFB74D;
}

.dark-mode .split-summary-top .split-label {
  color: #64B5F6;
}

.dark-mode .split-summary-top.duration-mismatch .split-label {
  color: #FFB74D;
}

.dark-mode .color-swatch.selected {
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px #1a1a1a, 0 0 0 4px #4CAF50;
}

.dark-mode .custom-properties-section {
  border-top-color: #3a3a3a;
}

.dark-mode .collapsible-header h4 {
  color: #b0b0b0;
}

.dark-mode .expand-icon {
  color: #888;
}

.dark-mode .invalid-field {
  border-color: #f44336 !important;
  background-color: rgba(244, 67, 54, 0.1) !important;
}

.dark-mode .btn-primary:disabled {
  background: #3a3a3a;
  color: #666666;
}

.dark-mode .percentage-symbol {
  color: #888;
}

.dark-mode .preset-button {
  background: #2a2a2a;
  border-color: #3a3a3a;
  color: #e0e0e0;
}

.dark-mode .preset-button:hover {
  background: #3a3a3a;
  border-color: #4a4a4a;
}

.dark-mode .preset-button.active {
  background: #4CAF50;
  border-color: #4CAF50;
  color: white;
}
</style>
