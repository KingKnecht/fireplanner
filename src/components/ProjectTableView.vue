<script setup lang="ts">
import { computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { usePlannerStore } from '../stores/plannerStore'
import type { Project, CustomPropertyDefinition } from '../types'

const props = defineProps<{
  customPropertyDefinitions: CustomPropertyDefinition[]
}>()

const emit = defineEmits<{
  selectProject: [project: Project]
}>()

const store = usePlannerStore()

// Filter out split projects - only show parent/non-split projects
const tableProjects = computed(() => {
  return store.projects.filter(p => !p.parentProjectId)
})

const getUserName = (userId: string | null) => {
  if (!userId) return 'Unassigned'
  const user = store.users.find(u => u.id === userId)
  return user?.name || 'Unknown'
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  })
}

const formatCustomProperty = (value: any, type: string) => {
  if (value === null || value === undefined) return ''
  
  switch (type) {
    case 'Date':
      return formatDate(new Date(value))
    case 'boolean':
      return value ? 'Yes' : 'No'
    case 'float':
      return typeof value === 'number' ? value.toFixed(2) : value
    default:
      return String(value)
  }
}

const onRowClick = (event: any) => {
  emit('selectProject', event.data)
}
</script>

<template>
  <div class="project-table-view">
    <DataTable 
      :value="tableProjects" 
      @row-click="onRowClick"
      stripedRows
      sortMode="multiple"
      removableSort
      :resizableColumns="true"
      columnResizeMode="expand"
      class="project-table"
    >
      <!-- Fixed Columns -->
      <Column field="name" header="Name" :sortable="true" style="min-width: 200px" />
      <Column field="userId" header="User" :sortable="true" style="min-width: 150px">
        <template #body="slotProps">
          {{ getUserName(slotProps.data.userId) }}
        </template>
      </Column>
      <Column field="startDate" header="Start Date" :sortable="true" style="min-width: 120px">
        <template #body="slotProps">
          {{ formatDate(slotProps.data.startDate) }}
        </template>
      </Column>
      <Column field="endDate" header="End Date" :sortable="true" style="min-width: 120px">
        <template #body="slotProps">
          {{ formatDate(slotProps.data.endDate) }}
        </template>
      </Column>
      <Column field="durationDays" header="Duration (days)" :sortable="true" style="min-width: 130px" />
      <Column field="bufferPercent" header="Buffer %" :sortable="true" style="min-width: 100px">
        <template #body="slotProps">
          {{ slotProps.data.bufferPercent }}%
        </template>
      </Column>
      <Column field="capacityPercent" header="Capacity %" :sortable="true" style="min-width: 110px">
        <template #body="slotProps">
          {{ slotProps.data.capacityPercent }}%
        </template>
      </Column>
      <Column field="estimatedProgress" header="Est. Progress %" :sortable="true" style="min-width: 130px">
        <template #body="slotProps">
          {{ slotProps.data.estimatedProgress ?? 0 }}%
        </template>
      </Column>
      <Column field="timeSpent" header="Time Spent (days)" :sortable="true" style="min-width: 140px">
        <template #body="slotProps">
          {{ slotProps.data.timeSpent ?? 0 }}
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
          {{ formatCustomProperty(slotProps.data.customProperties?.[propDef.name], propDef.type) }}
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

:deep(.p-datatable-tbody > tr) {
  cursor: pointer;
}

:deep(.p-datatable-tbody > tr:hover) {
  background-color: rgba(99, 102, 241, 0.1) !important;
}

.color-indicator {
  width: 40px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.2);
}
</style>

<style>
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
</style>

