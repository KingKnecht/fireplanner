<script setup lang="ts">
import { computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { usePlannerStore } from '../stores/plannerStore'
import { formatDate } from '../utils/dateUtils'
import type { Project, CustomPropertyDefinition } from '../types'

const props = defineProps<{
  customPropertyDefinitions: CustomPropertyDefinition[]
}>()

const emit = defineEmits<{
  selectProject: [project: Project]
}>()

const store = usePlannerStore()

// Calculate how "hot" a project is (how far behind schedule)
const getProjectHotness = (timeSpent: number, duration: number, estimatedProgress: number) => {
  if (duration === 0) return 0
  
  const timeSpentPercent = (timeSpent / duration) * 100
  
  // Most critical: time spent exceeds duration
  if (timeSpent > duration) {
    return 1000 + (timeSpent - duration) * 10 // Very high priority
  }
  
  // Critical: behind schedule (spent more time than progress indicates)
  const behindBy = timeSpentPercent - estimatedProgress
  if (behindBy > 0) {
    return behindBy // Higher = more behind
  }
  
  // On track or ahead: negative values (lower priority)
  return behindBy
}

// Filter out split projects - only show parent/non-split projects  
// Force reactivity by creating new object references
const tableProjects = computed(() => {
  // Access store.projects to establish reactivity
  const allProjects = store.projects
  
  const projects = allProjects
    .filter(p => !p.parentProjectId)
    .map(p => {
      // Create new object reference to ensure DataTable detects changes
      return {
        id: p.id,
        name: p.name,
        userId: p.userId,
        startDate: p.startDate,
        endDate: p.endDate,
        deadline: p.deadline,
        durationDays: p.durationDays,
        bufferPercent: p.bufferPercent,
        capacityPercent: p.capacityPercent,
        estimatedProgress: p.estimatedProgress,
        timeSpent: p.timeSpent,
        color: p.color,
        zIndex: p.zIndex,
        customProperties: p.customProperties || {},
        parentProjectId: p.parentProjectId,
        originalDurationDays: p.originalDurationDays,
        overallDurationDays: p.overallDurationDays
      }
    })
  
  // Sort by hotness - hot projects first
  return projects.sort((a, b) => {
    const hotnessA = getProjectHotness(a.timeSpent ?? 0, a.durationDays, a.estimatedProgress ?? 0)
    const hotnessB = getProjectHotness(b.timeSpent ?? 0, b.durationDays, b.estimatedProgress ?? 0)
    return hotnessB - hotnessA // Descending: hottest first
  })
})

const getUserName = (userId: string | null) => {
  if (!userId) return 'Unassigned'
  const user = store.users.find(u => u.id === userId)
  return user?.name || 'Unknown'
}

const formatCustomProperty = (value: any, propDef: CustomPropertyDefinition) => {
  if (value === null || value === undefined) return ''
  
  switch (propDef.type) {
    case 'Date':
      return formatDate(new Date(value))
    case 'boolean':
      return value ? 'Yes' : 'No'
    case 'float':
      return typeof value === 'number' ? value.toFixed(2) : value
    case 'enum':
      // For enum, lookup the display name from the numeric value
      if (propDef.values) {
        const entry = Object.entries(propDef.values).find(([_, val]) => val === value)
        return entry ? entry[0] : String(value)
      }
      return String(value)
    default:
      return String(value)
  }
}

const onRowClick = (event: any) => {
  emit('selectProject', event.data)
}

const getProgressBarWidth = (value: number, max: number) => {
  if (max === 0) return 0
  return Math.min((value / max) * 100, 100)
}

const getProgressColor = (timeSpent: number, duration: number, estimatedProgress: number) => {
  // If time spent exceeds duration, show warning (orange/red)
  if (timeSpent > duration) return '#ff9800' // Orange
  
  // If estimated progress is significantly behind time spent percentage, show warning
  const timeSpentPercent = duration > 0 ? (timeSpent / duration) * 100 : 0
  if (estimatedProgress < timeSpentPercent - 15) return '#ff9800' // Orange - falling behind
  
  // Otherwise show normal progress (green)
  return '#4caf50' // Green
}

const getTimeSpentPercent = (timeSpent: number, duration: number) => {
  if (duration === 0) return 0
  return Math.round((timeSpent / duration) * 100)
}

const getSpentPercentageColor = (timeSpent: number, duration: number, estimatedProgress: number) => {
  const timeSpentPercent = getTimeSpentPercent(timeSpent, duration)
  
  // Deep red if over budget (spent more days than duration)
  if (timeSpent > duration) return '#b71c1c' // Deep red
  
  // Red if behind schedule (spent % > progress %)
  if (timeSpentPercent > estimatedProgress) return '#f44336' // Red
  
  // Green if ahead of schedule (spent % < progress %)
  if (timeSpentPercent < estimatedProgress) return '#4caf50' // Green
  
  // Neutral if exactly on track
  return '#757575' // Grey
}

const tableProjectsWithClass = computed(() => {
  return tableProjects.value.map(project => {
    const timeSpent = project.timeSpent ?? 0
    const duration = project.durationDays
    const estimatedProgress = project.estimatedProgress ?? 0
    const timeSpentPercent = duration > 0 ? (timeSpent / duration) * 100 : 0
    
    let statusClass = 'row-ontrack'
    if (timeSpent > duration) {
      statusClass = 'row-critical'
    } else if (timeSpentPercent > estimatedProgress) {
      statusClass = 'row-behind'
    } else if (timeSpentPercent < estimatedProgress) {
      statusClass = 'row-ahead'
    }
    
    return {
      ...project,
      _statusClass: statusClass
    }
  })
})

const onCellEditComplete = (event: any) => {
  const { data, newValue, field } = event
  
  console.log('[TableView] Cell edit complete:', { field, newValue, dataId: data.id })
  
  // Handle nested fields (custom properties)
  if (field.startsWith('customProperties.')) {
    const propName = field.replace('customProperties.', '')
    const propDef = props.customPropertyDefinitions.find(p => p.name === propName)
    
    if (propDef) {
      // For custom properties, get the actual value from the data object
      // since we bind directly to it in the editor
      const actualValue = data.customProperties?.[propName]
      console.log('[TableView] Custom property edit:', { propName, actualValue, propType: propDef.type })
      
      const customProps = { ...data.customProperties }
      
      // The value is already set in data.customProperties from v-model
      // Just ensure proper typing
      if (propDef.type === 'number' || propDef.type === 'float' || propDef.type === 'enum') {
        customProps[propName] = actualValue === '' || actualValue === null ? null : Number(actualValue)
      } else if (propDef.type === 'boolean') {
        customProps[propName] = actualValue === 'true' || actualValue === true || actualValue === 'Yes'
      } else if (propDef.type === 'Date') {
        customProps[propName] = actualValue ? new Date(actualValue) : null
      } else {
        customProps[propName] = actualValue
      }
      
      console.log('[TableView] Updating custom props:', customProps)
      store.updateProject(data.id, { customProperties: customProps })
    }
    return
  }
  
  // Handle regular fields
  const updates: any = {}
  
  switch (field) {
    case 'name':
      updates.name = newValue
      break
    case 'userId':
      updates.userId = newValue === '' ? null : newValue
      break
    case 'startDate':
    case 'deadline':
      // Use newValue for date fields (native date input returns new value in event)
      updates[field] = newValue instanceof Date ? newValue : (newValue ? new Date(newValue) : null)
      break
    case 'durationDays':
    case 'bufferPercent':
    case 'capacityPercent':
    case 'estimatedProgress':
    case 'timeSpent':
      updates[field] = newValue === '' ? 0 : Number(newValue)
      break
    default:
      updates[field] = newValue
  }
  
  if (Object.keys(updates).length > 0) {
    store.updateProject(data.id, updates)
  }
}

</script>

<template>
  <div class="project-table-view">
    <DataTable 
      :value="tableProjectsWithClass" 
      @row-click="onRowClick"
      @cell-edit-complete="onCellEditComplete"
      editMode="cell"
      stripedRows
      sortMode="multiple"
      removableSort
      :resizableColumns="true"
      columnResizeMode="expand"
      :rowClass="(data: any) => data._statusClass"
      class="project-table"
    >
      <!-- Fixed Columns -->
      <Column field="name" header="Name" :sortable="true" style="min-width: 200px">
        <template #editor="{ data, field }">
          <input v-model="data[field]" type="text" class="p-inputtext" />
        </template>
      </Column>
      <Column field="userId" header="User" :sortable="true" style="min-width: 150px">
        <template #body="slotProps">
          {{ getUserName(slotProps.data.userId) }}
        </template>
        <template #editor="{ data, field }">
          <select v-model="data[field]" class="p-dropdown">
            <option :value="null">Unassigned</option>
            <option v-for="user in store.users" :key="user.id" :value="user.id">
              {{ user.name }}
            </option>
          </select>
        </template>
      </Column>
      <!-- Date columns use native HTML date input instead of PrimeVue DatePicker
           because DatePicker is incompatible with DataTable cell editing mode:
           clicking the calendar popup is treated as clicking outside the cell,
           which closes the editor before a date can be selected.
           See: https://github.com/primefaces/primevue/issues/7710 -->
      <Column field="startDate" header="Start Date" :sortable="true" style="min-width: 120px">
        <template #body="slotProps">
          {{ formatDate(slotProps.data.startDate) }}
        </template>
        <template #editor="{ data, field }">
          <input 
            type="date" 
            :value="data[field] ? new Date(data[field]).toISOString().split('T')[0] : ''"
            @input="(e) => data[field] = (e.target as HTMLInputElement).value ? new Date((e.target as HTMLInputElement).value) : null"
            class="p-inputtext"
          />
        </template>
      </Column>
      <Column field="endDate" header="End Date" :sortable="true" style="min-width: 120px">
        <template #body="slotProps">
          {{ formatDate(slotProps.data.endDate) }}
        </template>
      </Column>
      <Column field="deadline" header="Deadline" :sortable="true" style="min-width: 120px">
        <template #body="slotProps">
          {{ formatDate(slotProps.data.deadline) }}
        </template>
        <template #editor="{ data, field }">
          <input 
            type="date" 
            :value="data[field] ? new Date(data[field]).toISOString().split('T')[0] : ''"
            @input="(e) => data[field] = (e.target as HTMLInputElement).value ? new Date((e.target as HTMLInputElement).value) : null"
            class="p-inputtext"
          />
        </template>
      </Column>
      <Column field="durationDays" header="Duration (days)" :sortable="true" style="min-width: 130px">
        <template #editor="{ data, field }">
          <input v-model.number="data[field]" type="number" step="0.5" min="0.5" class="p-inputtext" />
        </template>
      </Column>
      <Column field="bufferPercent" header="Buffer %" :sortable="true" style="min-width: 100px">
        <template #body="slotProps">
          {{ slotProps.data.bufferPercent }}%
        </template>
        <template #editor="{ data, field }">
          <select v-model.number="data[field]" class="p-dropdown">
            <option :value="0">0%</option>
            <option :value="10">10%</option>
            <option :value="25">25%</option>
            <option :value="33">33%</option>
            <option :value="50">50%</option>
            <option :value="75">75%</option>
            <option :value="100">100%</option>
          </select>
        </template>
      </Column>
      <Column field="capacityPercent" header="Capacity %" :sortable="true" style="min-width: 110px">
        <template #body="slotProps">
          {{ slotProps.data.capacityPercent }}%
        </template>
        <template #editor="{ data, field }">
          <input v-model.number="data[field]" type="number" min="1" max="100" class="p-inputtext" />
        </template>
      </Column>
      
      <!-- Progress Bars Column -->
      <Column header="Progress Overview" style="min-width: 250px">
        <template #body="slotProps">
          <div class="progress-bars-container">
            <!-- Duration Bar (Reference) -->
            <div class="progress-bar-row">
              <span class="bar-label">Duration:</span>
              <div class="progress-bar-bg">
                <div 
                  class="progress-bar duration-bar"
                  :style="{ width: '100%' }"
                >
                  {{ slotProps.data.durationDays }}d
                </div>
              </div>
            </div>
            
            <!-- Time Spent Bar -->
            <div class="progress-bar-row">
              <span class="bar-label">Spent:</span>
              <div class="progress-bar-bg">
                <div 
                  class="progress-bar spent-bar"
                  :style="{ 
                    width: getProgressBarWidth(slotProps.data.timeSpent, slotProps.data.durationDays) + '%',
                    backgroundColor: slotProps.data.timeSpent > slotProps.data.durationDays ? '#ff5722' : '#2196F3'
                  }"
                >
                  {{ slotProps.data.timeSpent ?? 0 }}d
                </div>
              </div>
            </div>
            
            <!-- Estimated Progress Bar -->
            <div class="progress-bar-row">
              <span class="bar-label">Progress:</span>
              <div class="progress-bar-bg">
                <div 
                  class="progress-bar progress-bar-fill"
                  :style="{ 
                    width: (slotProps.data.estimatedProgress ?? 0) + '%',
                    backgroundColor: getProgressColor(
                      slotProps.data.timeSpent ?? 0,
                      slotProps.data.durationDays,
                      slotProps.data.estimatedProgress ?? 0
                    )
                  }"
                >
                  {{ slotProps.data.estimatedProgress ?? 0 }}%
                </div>
              </div>
            </div>
          </div>
        </template>
      </Column>
      
      <Column field="estimatedProgress" header="Est. Progress %" :sortable="true" style="min-width: 130px">
        <template #body="slotProps">
          {{ slotProps.data.estimatedProgress ?? 0 }}%
        </template>
        <template #editor="{ data, field }">
          <input v-model.number="data[field]" type="number" min="0" max="100" class="p-inputtext" />
        </template>
      </Column>
      <Column field="timeSpent" header="Time Spent (days)" :sortable="true" style="min-width: 140px">
        <template #body="slotProps">
          <span>{{ slotProps.data.timeSpent ?? 0 }}</span>
          <span 
            class="spent-percentage"
            :style="{ 
              color: getSpentPercentageColor(
                slotProps.data.timeSpent ?? 0, 
                slotProps.data.durationDays, 
                slotProps.data.estimatedProgress ?? 0
              )
            }"
          >
            ({{ getTimeSpentPercent(slotProps.data.timeSpent ?? 0, slotProps.data.durationDays) }}%)
          </span>
        </template>
        <template #editor="{ data, field }">
          <input v-model.number="data[field]" type="number" step="0.5" min="0" class="p-inputtext" />
        </template>
      </Column>
      <Column field="color" header="Color" :sortable="true" style="min-width: 100px">
        <template #body="slotProps">
          <div class="color-indicator" :style="{ backgroundColor: slotProps.data.color }" />
        </template>
      </Column>
      
      <!-- Custom Property Columns -->
      <Column 
        v-for="propDef in customPropertyDefinitions" 
        :key="propDef.name"
        :field="`customProperties.${propDef.name}`" 
        :header="propDef.name" 
        :sortable="true"
        style="min-width: 120px"
      >
        <template #body="slotProps">
          {{ formatCustomProperty(slotProps.data.customProperties?.[propDef.name], propDef) }}
        </template>
        <template #editor="{ data }">
          <!-- String editor -->
          <input 
            v-if="propDef.type === 'string'"
            v-model="data.customProperties[propDef.name]"
            type="text"
            class="p-inputtext"
          />
          <!-- Number editor -->
          <input 
            v-else-if="propDef.type === 'number'"
            v-model.number="data.customProperties[propDef.name]"
            type="number"
            step="1"
            class="p-inputtext"
          />
          <!-- Float editor -->
          <input 
            v-else-if="propDef.type === 'float'"
            v-model.number="data.customProperties[propDef.name]"
            type="number"
            step="any"
            class="p-inputtext"
          />
          <!-- Boolean editor -->
          <select 
            v-else-if="propDef.type === 'boolean'"
            v-model="data.customProperties[propDef.name]"
            class="p-dropdown"
          >
            <option :value="true">Yes</option>
            <option :value="false">No</option>
          </select>
          <!-- Enum editor -->
          <select 
            v-else-if="propDef.type === 'enum'"
            v-model.number="data.customProperties[propDef.name]"
            class="p-dropdown"
          >
            <option :value="null">Select {{ propDef.name }}</option>
            <option 
              v-for="(value, label) in propDef.values" 
              :key="value" 
              :value="value"
            >
              {{ label }}
            </option>
          </select>
          <!-- Date editor -->
          <input
            v-else-if="propDef.type === 'Date'"
            type="date"
            :value="data.customProperties[propDef.name] ? new Date(data.customProperties[propDef.name]).toISOString().split('T')[0] : ''"
            @input="(e) => data.customProperties[propDef.name] = (e.target as HTMLInputElement).value ? new Date((e.target as HTMLInputElement).value) : null"
            class="p-inputtext"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.project-table-view {
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: #ffffff;
}

.project-table {
  font-size: 14px;
}

/* Editor styling */
:deep(.p-inputtext) {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 14px;
}

:deep(.p-dropdown) {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  color: #000;
}

:deep(.p-dropdown option) {
  background: white;
  color: #000;
}

:deep(.p-datepicker input) {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 14px;
}

:deep(.p-datatable-tbody > tr) {
  cursor: pointer;
}

:deep(.p-datatable-tbody > tr:hover) {
  background-color: rgba(99, 102, 241, 0.1) !important;
}

:deep(.p-datatable .p-datatable-tbody > tr > td.p-cell-editing) {
  padding: 2px;
  cursor: text;
}

:deep(.p-datatable .p-datatable-tbody > tr > td.p-cell-editing:hover) {
  background-color: rgba(99, 102, 241, 0.05) !important;
}

.color-indicator {
  width: 40px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.2);
}

/* Progress Bars */
.progress-bars-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
}

.progress-bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar-label {
  font-size: 11px;
  min-width: 60px;
  color: #666;
  font-weight: 500;
}

.progress-bar-bg {
  flex: 1;
  height: 20px;
  background-color: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-bar {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: white;
  transition: width 0.3s ease;
  min-width: 30px;
  white-space: nowrap;
  padding: 0 4px;
}

.spent-percentage {
  margin-left: 6px;
  font-weight: 600;
  font-size: 12px;
}

.duration-bar {
  background-color: #9e9e9e;
}

.spent-bar {
  background-color: #2196F3;
}

.progress-bar-fill {
  background-color: #4caf50;
}

</style>

<style>
/* Row status borders - unscoped to override PrimeVue */
.p-datatable .p-datatable-tbody > tr.row-critical,
.p-datatable .p-datatable-tbody > tr.row-critical:nth-child(even) {
  border-left: 5px solid #b71c1c !important;
  background-color: rgba(183, 28, 28, 0.1) !important;
}

.p-datatable .p-datatable-tbody > tr.row-behind,
.p-datatable .p-datatable-tbody > tr.row-behind:nth-child(even) {
  border-left: 5px solid #f44336 !important;
  background-color: rgba(244, 67, 54, 0.1) !important;
}

.p-datatable .p-datatable-tbody > tr.row-ahead,
.p-datatable .p-datatable-tbody > tr.row-ahead:nth-child(even) {
  border-left: 5px solid #4caf50 !important;
  background-color: rgba(76, 175, 80, 0.1) !important;
}

.p-datatable .p-datatable-tbody > tr.row-ontrack,
.p-datatable .p-datatable-tbody > tr.row-ontrack:nth-child(even) {
  border-left: 5px solid #757575 !important;
}

.p-datatable .p-datatable-tbody > tr.row-critical > td,
.p-datatable .p-datatable-tbody > tr.row-behind > td,
.p-datatable .p-datatable-tbody > tr.row-ahead > td,
.p-datatable .p-datatable-tbody > tr.row-ontrack > td {
  border-left: none !important;
}

.p-datatable .p-datatable-tbody > tr.row-critical > td:first-child,
.p-datatable .p-datatable-tbody > tr.row-behind > td:first-child,
.p-datatable .p-datatable-tbody > tr.row-ahead > td:first-child,
.p-datatable .p-datatable-tbody > tr.row-ontrack > td:first-child {
  border-left: inherit !important;
}

.dark-mode .p-datatable .p-datatable-tbody > tr.row-critical,
.dark-mode .p-datatable .p-datatable-tbody > tr.row-critical:nth-child(even) {
  background-color: rgba(183, 28, 28, 0.2) !important;
}

.dark-mode .p-datatable .p-datatable-tbody > tr.row-behind,
.dark-mode .p-datatable .p-datatable-tbody > tr.row-behind:nth-child(even) {
  background-color: rgba(244, 67, 54, 0.2) !important;
}

.dark-mode .p-datatable .p-datatable-tbody > tr.row-ahead,
.dark-mode .p-datatable .p-datatable-tbody > tr.row-ahead:nth-child(even) {
  background-color: rgba(76, 175, 80, 0.2) !important;
}

/* Dark mode styles - unscoped to override PrimeVue */
.dark-mode .project-table-view {
  background-color: #1e1e1e !important;
}

.dark-mode .project-table {
  background-color: #1e1e1e !important;
}

.dark-mode .p-datatable {
  background-color: #1e1e1e !important;
  color: #e0e0e0 !important;
}

.dark-mode .p-datatable .p-datatable-header {
  background-color: #2d2d2d !important;
  color: #e0e0e0 !important;
  border-color: #3d3d3d !important;
}

.dark-mode .p-datatable .p-datatable-thead > tr > th {
  background-color: #2d2d2d !important;
  color: #e0e0e0 !important;
  border-color: #3d3d3d !important;
}

.dark-mode .p-datatable .p-datatable-tbody > tr {
  background-color: #1e1e1e !important;
  color: #e0e0e0 !important;
  border-color: #3d3d3d !important;
}

.dark-mode .p-datatable .p-datatable-tbody > tr:nth-child(even) {
  background-color: #252525 !important;
}

.dark-mode .p-datatable .p-datatable-tbody > tr:hover {
  background-color: rgba(99, 102, 241, 0.2) !important;
}

.dark-mode .p-datatable .p-datatable-tbody > tr > td {
  background-color: inherit !important;
  color: #e0e0e0 !important;
  border-color: #3d3d3d !important;
}

.dark-mode .color-indicator {
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
}

.dark-mode .p-datatable-wrapper {
  background-color: #1e1e1e !important;
}

.dark-mode .p-datatable-table {
  background-color: #1e1e1e !important;
}

.dark-mode .bar-label {
  color: #aaa;
}

.dark-mode .progress-bar-bg {
  background-color: #2a2a2a;
}

/* Dark mode editor styling */
.dark-mode :deep(.p-inputtext) {
  background-color: #2a2a2a;
  border-color: #3d3d3d;
  color: #e0e0e0;
}

.dark-mode :deep(.p-dropdown) {
  background-color: #2a2a2a;
  border-color: #3d3d3d;
  color: #e0e0e0;
}

.dark-mode :deep(.p-dropdown option) {
  background-color: #2a2a2a;
  color: #e0e0e0;
}

.dark-mode :deep(.p-datepicker input) {
  background-color: #2a2a2a;
  border-color: #3d3d3d;
  color: #e0e0e0;
}

.dark-mode :deep(.p-datatable .p-datatable-tbody > tr > td.p-cell-editing) {
  background-color: #2a2a2a !important;
}

</style>

