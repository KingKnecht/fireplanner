<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import PlannerGrid from './components/PlannerGrid.vue'
import ProjectEditorPanel from './components/ProjectEditorPanel.vue'
import UserDialog from './components/UserDialog.vue'
import { usePlannerStore } from './stores/plannerStore'
import type { Project } from './types'

const store = usePlannerStore()
const isUserDialogOpen = ref(false)
const selectedProject = ref<Project | null>(null)

const newProjectData = ref<{ userId: string | null; startDate: Date } | null>(null)

// Undo/Redo functionality
const canUndo = ref(false)
const canRedo = ref(false)

function updateHistoryState() {
  // @ts-ignore - pinia-plugin-history adds these getters to the store
  canUndo.value = store.canUndo ?? false
  // @ts-ignore
  canRedo.value = store.canRedo ?? false
}

function handleUndo() {
  // @ts-ignore - pinia-plugin-history adds undo action
  if (store.canUndo) {
    // @ts-ignore
    store.undo()
    updateHistoryState()
  }
}

function handleRedo() {
  // @ts-ignore - pinia-plugin-history adds redo action
  if (store.canRedo) {
    // @ts-ignore
    store.redo()
    updateHistoryState()
  }
}

// Keyboard shortcuts
function handleKeydown(e: KeyboardEvent) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const ctrlKey = isMac ? e.metaKey : e.ctrlKey
  
  if (ctrlKey && !e.shiftKey && e.key === 'z') {
    e.preventDefault()
    handleUndo()
  } else if ((ctrlKey && e.shiftKey && e.key === 'z') || (ctrlKey && e.key === 'y')) {
    e.preventDefault()
    handleRedo()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  updateHistoryState()
  
  // Update history state whenever store changes
  // @ts-ignore
  store.$subscribe(() => {
    updateHistoryState()
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function handleCreateProject(userId: string | null, startDate: Date) {
  selectedProject.value = null
  newProjectData.value = { userId, startDate }
}

function handleEditProject(project: Project) {
  selectedProject.value = project
}

function handleProjectCreate(data: {
  name: string
  userId: string | null
  startDate: Date
  durationDays: number
  bufferPercent: number
  color: string
  zIndex: number
}) {
  const project = store.addProject(data)
  // Auto-select the newly created project
  if (project) {
    selectedProject.value = project
  }
}

function handleProjectUpdate(projectId: string, updates: Partial<{
  name: string
  userId: string | null
  startDate: Date
  durationDays: number
  bufferPercent: number
  color: string
}>) {
  store.updateProject(projectId, updates)
  // Update selectedProject to point to the updated object from the store
  if (selectedProject.value && selectedProject.value.id === projectId) {
    selectedProject.value = store.projects.find(p => p.id === projectId) || null
  }
}

function handleProjectDelete() {
  if (selectedProject.value) {
    store.deleteProject(selectedProject.value.id)
    selectedProject.value = null
  }
}

function handleProjectClear() {
  selectedProject.value = null
  newProjectData.value = null
}

function handleUpdateZIndex(projectId: string, zIndex: number) {
  store.updateProject(projectId, { zIndex })
  // Update selectedProject to point to the updated object from the store
  if (selectedProject.value && selectedProject.value.id === projectId) {
    selectedProject.value = store.projects.find(p => p.id === projectId) || null
  }
}

function addNewUser() {
  isUserDialogOpen.value = true
}

function handleUserDialogSubmit(data: { name: string; color: string }) {
  store.addUser(data.name, data.color)
}

function handleUserDialogClose() {
  isUserDialogOpen.value = false
}

function handleMoveProject(projectId: string, newUserId: string | null, newStartDate: Date) {
  store.updateProject(projectId, {
    userId: newUserId,
    startDate: newStartDate
  })
  // Update selectedProject to point to the updated object from the store
  if (selectedProject.value && selectedProject.value.id === projectId) {
    selectedProject.value = store.projects.find(p => p.id === projectId) || null
  }
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>FirePlanner</h1>
      <div class="header-actions">
        <button 
          @click="handleUndo" 
          :disabled="!canUndo"
          class="btn-header"
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
        </button>
        <button 
          @click="handleRedo" 
          :disabled="!canRedo"
          class="btn-header"
          title="Redo (Ctrl+Y)"
        >
          ↷ Redo
        </button>
        <button @click="addNewUser" class="btn-header">Add User</button>
      </div>
    </header>

    <main class="app-main">
      <PlannerGrid
        :users="store.users"
        :weekdays="store.weekdays"
        :get-projects-for-user="store.getProjectsForUser"
        :show-unassigned="true"
        @create-project="handleCreateProject"
        @edit-project="handleEditProject"
        @move-project="handleMoveProject"
      />

      <ProjectEditorPanel
        :users="store.users"
        :selected-project="selectedProject"
        :new-project-data="newProjectData"
        @create="handleProjectCreate"
        @update="handleProjectUpdate"
        @update-z-index="handleUpdateZIndex"
        @delete="handleProjectDelete"
        @clear="handleProjectClear"
      />
    </main>

    <UserDialog
      :is-open="isUserDialogOpen"
      @submit="handleUserDialogSubmit"
      @close="handleUserDialogClose"
    />
  </div>
</template>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-header {
  background: #1a1a1a;
  color: white;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  margin: 0;
  font-size: 24px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-header {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
  background: #333;
  color: white;
}

.btn-header:hover {
  background: #444;
}

.btn-header:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-header:disabled:hover {
  background: #333;
}

.btn-header.btn-primary {
  background: #4CAF50;
}

.btn-header.btn-primary:hover {
  background: #45a049;
}

.app-main {
  flex: 1;
  overflow: hidden;
  display: flex;
}
</style>
