<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import PlannerGrid from './components/PlannerGrid.vue'
import ProjectEditorPanel from './components/ProjectEditorPanel.vue'
import UserDialog from './components/UserDialog.vue'
import { usePlannerStore } from './stores/plannerStore'
import type { Project } from './types'
import type { AppConfig } from './electron'

const toast = useToast()

const store = usePlannerStore()
const isUserDialogOpen = ref(false)
const selectedProject = ref<Project | null>(null)
const plannerGridRef = ref<InstanceType<typeof PlannerGrid> | null>(null)

const newProjectData = ref<{ userId: string | null; startDate: Date } | null>(null)

// Clipboard for copy/cut/paste
const clipboard = ref<Omit<Project, 'id'> | null>(null)
const isCutOperation = ref(false)
const cutProjectId = ref<string | null>(null)

// Autosave
const autosaveConfig = ref<AppConfig['autosave'] | null>(null)
let autosaveTimer: NodeJS.Timeout | null = null
const isDirty = ref(false)
const currentFilePath = ref<string | null>(null)
const isLoadingFile = ref(false)

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

onMounted(async () => {
  updateHistoryState()
  
  // Update history state whenever store changes
  // @ts-ignore
  store.$subscribe(() => {
    updateHistoryState()
    if (!isLoadingFile.value) {
      setDirty(true)
      scheduleAutosave()
    }
  })
  
  // Listen for menu events from Electron
  if (window.electron) {
    window.electron.receive('menu:new', handleNew)
    window.electron.receive('menu:save', handleSave)
    window.electron.receive('menu:open', handleLoad)
    window.electron.receive('menu:undo', handleUndo)
    window.electron.receive('menu:redo', handleRedo)
    
    // Load autosave config
    const config = await window.electron.getConfig()
    autosaveConfig.value = config.autosave
    console.log('[Autosave] Config loaded:', config.autosave)
  }
  
  // Add keyboard listener for Delete/Backspace
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer)
  }
  window.removeEventListener('keydown', handleKeyDown)
})

function handleKeyDown(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
  
  // Copy project with Ctrl+C
  if (event.ctrlKey && event.key === 'c' && selectedProject.value && !isInputField) {
    event.preventDefault()
    handleCopy()
    return
  }
  
  // Cut project with Ctrl+X
  if (event.ctrlKey && event.key === 'x' && selectedProject.value && !isInputField) {
    event.preventDefault()
    handleCut()
    return
  }
  
  // Paste project with Ctrl+V
  if (event.ctrlKey && event.key === 'v' && clipboard.value && !isInputField) {
    event.preventDefault()
    handlePaste()
    return
  }
  
  // Delete selected project with Delete or Backspace key
  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedProject.value) {
    // Prevent backspace from navigating back
    if (!isInputField) {
      event.preventDefault()
      handleProjectDelete()
    }
  }
}

function handleCopy() {
  if (!selectedProject.value) return
  
  // Copy all project properties except id
  clipboard.value = {
    name: selectedProject.value.name,
    userId: selectedProject.value.userId,
    startDate: selectedProject.value.startDate,
    endDate: selectedProject.value.endDate,
    durationDays: selectedProject.value.durationDays,
    bufferPercent: selectedProject.value.bufferPercent,
    capacityPercent: selectedProject.value.capacityPercent,
    color: selectedProject.value.color,
    zIndex: selectedProject.value.zIndex
  }
  isCutOperation.value = false
  cutProjectId.value = null
  console.log('[Clipboard] Copied project:', selectedProject.value.name)
}

function handleCut() {
  if (!selectedProject.value) return
  
  // Copy project data
  clipboard.value = {
    name: selectedProject.value.name,
    userId: selectedProject.value.userId,
    startDate: selectedProject.value.startDate,
    endDate: selectedProject.value.endDate,
    durationDays: selectedProject.value.durationDays,
    bufferPercent: selectedProject.value.bufferPercent,
    capacityPercent: selectedProject.value.capacityPercent,
    color: selectedProject.value.color,
    zIndex: selectedProject.value.zIndex
  }
  isCutOperation.value = true
  cutProjectId.value = selectedProject.value.id
  console.log('[Clipboard] Cut project:', selectedProject.value.name)
}

function handlePaste() {
  if (!clipboard.value) return
  
  // Create new project with clipboard data (new ID will be generated)
  const newProject = store.addProject({
    name: clipboard.value.name,
    userId: clipboard.value.userId,
    startDate: clipboard.value.startDate,
    durationDays: clipboard.value.durationDays,
    bufferPercent: clipboard.value.bufferPercent,
    capacityPercent: clipboard.value.capacityPercent,
    color: clipboard.value.color,
    zIndex: clipboard.value.zIndex
  })
  
  // If it was a cut operation, delete the original project
  if (isCutOperation.value && cutProjectId.value) {
    store.deleteProject(cutProjectId.value)
    isCutOperation.value = false
    cutProjectId.value = null
  }
  
  // Select the newly pasted project
  if (newProject) {
    selectedProject.value = newProject
  }
  
  console.log('[Clipboard] Pasted project:', clipboard.value.name)
}

// File operations
function setDirty(dirty: boolean) {
  isDirty.value = dirty
  if (window.electron?.setTitle) {
    const filename = currentFilePath.value 
      ? currentFilePath.value.split('/').pop()?.replace('.fpj', '') || 'Untitled'
      : 'Untitled'
    const title = dirty ? `${filename}* - FirePlanner` : `${filename} - FirePlanner`
    window.electron.setTitle(title)
  }
}

function handleNew() {
  if (confirm('Create new plan? Any unsaved changes will be lost.')) {
    isLoadingFile.value = true
    store.users = []
    store.projects = []
    selectedProject.value = null
    currentFilePath.value = null
    setDirty(false)
    isLoadingFile.value = false
  }
}

async function handleSave() {
  if (!window.electron?.saveFile) return

  try {
    // Serialize projects with dates as ISO strings
    // Create plain objects to avoid Pinia reactivity proxy issues
    const serializedProjects = store.projects.map(p => ({
      id: p.id,
      name: p.name,
      userId: p.userId,
      startDate: p.startDate.toISOString(),
      endDate: p.endDate.toISOString(),
      durationDays: p.durationDays,
      bufferPercent: p.bufferPercent,
      capacityPercent: p.capacityPercent,
      color: p.color,
      zIndex: p.zIndex
    }))
    
    const serializedUsers = store.users.map(u => ({
      id: u.id,
      name: u.name,
      color: u.color
    }))
    
    const result = await window.electron.saveFile({
      users: serializedUsers,
      projects: serializedProjects
    })
    if (result.success) {
      if (result.filePath) {
        currentFilePath.value = result.filePath
      }
      setDirty(false)
      console.log('[Save] File saved successfully')
    }
  } catch (error) {
    console.error('Failed to save:', error)
    alert('Failed to save file: ' + error)
  }
}

async function handleLoad() {
  if (!window.electron?.openFile) return

  try {
    const result = await window.electron.openFile()
    if (result.success && result.data) {
      isLoadingFile.value = true
      // Store the opened file path
      if (result.filePath) {
        currentFilePath.value = result.filePath
      }
      // Load users and projects from file
      store.users = result.data.users || []
      store.projects = (result.data.projects || []).map((p: any) => ({
        ...p,
        startDate: new Date(p.startDate),
        endDate: new Date(p.endDate),
        capacityPercent: p.capacityPercent ?? 100
      }))
      // Clear selection after load
      selectedProject.value = null
      setDirty(false)
      isLoadingFile.value = false
      // Scroll to today after loading
      setTimeout(() => {
        plannerGridRef.value?.scrollToToday()
      }, 100)
    }
  } catch (error) {
    isLoadingFile.value = false
    console.error('Failed to load:', error)
    alert('Failed to load file: ' + error)
  }
}

// Autosave functions
function scheduleAutosave() {
  if (!autosaveConfig.value?.enabled || !window.electron?.autosave) return
  
  console.log('[Autosave] Scheduling autosave in', autosaveConfig.value.intervalSeconds, 'seconds')
  
  // Clear existing timer
  if (autosaveTimer) {
    clearTimeout(autosaveTimer)
  }
  
  // Schedule new autosave
  autosaveTimer = setTimeout(() => {
    performAutosave()
  }, autosaveConfig.value.intervalSeconds * 1000)
}

async function performAutosave() {
  if (!window.electron?.autosave) return
  
  // Only autosave if there are changes
  if (!isDirty.value) {
    console.log('[Autosave] Skipping - no changes')
    scheduleAutosave()
    return
  }
  
  console.log('[Autosave] Starting autosave...')
  
  try {
    const serializedProjects = store.projects.map(p => ({
      id: p.id,
      name: p.name,
      userId: p.userId,
      startDate: p.startDate.toISOString(),
      endDate: p.endDate.toISOString(),
      durationDays: p.durationDays,
      bufferPercent: p.bufferPercent,
      capacityPercent: p.capacityPercent,
      color: p.color,
      zIndex: p.zIndex
    }))
    
    const serializedUsers = store.users.map(u => ({
      id: u.id,
      name: u.name,
      color: u.color
    }))
    
    const result = await window.electron.autosave({
      users: serializedUsers,
      projects: serializedProjects
    })
    
    if (result.success) {
      console.log('[Autosave] Success:', result.path)
      setDirty(false)
      toast.add({
        severity: 'success',
        summary: 'Autosaved',
        detail: result.path,
        life: 3000
      })
    } else {
      console.error('[Autosave] Failed:', result.error)
      toast.add({
        severity: 'error',
        summary: 'Autosave Failed',
        detail: result.error,
        life: 5000
      })
    }
  } catch (error) {
    console.error('[Autosave] Error:', error)
    toast.add({
      severity: 'error',
      summary: 'Autosave Error',
      detail: String(error),
      life: 5000
    })
  } finally {
    // Schedule the next autosave
    scheduleAutosave()
  }
}

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
  capacityPercent: number
  color: string
  zIndex: number
}) {
  const project = store.addProject(data)
  setDirty(true)
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
  setDirty(true)
  // Update selectedProject to point to the updated object from the store
  if (selectedProject.value && selectedProject.value.id === projectId) {
    selectedProject.value = store.projects.find(p => p.id === projectId) || null
  }
}

function handleProjectDelete() {
  if (selectedProject.value) {
    store.deleteProject(selectedProject.value.id)
    setDirty(true)
    selectedProject.value = null
  }
}

function handleProjectClear() {
  selectedProject.value = null
  newProjectData.value = null
}

function handleUpdateZIndex(projectId: string, zIndex: number) {
  store.updateProject(projectId, { zIndex })
  setDirty(true)
  // Update selectedProject to point to the updated object from the store
  if (selectedProject.value && selectedProject.value.id === projectId) {
    selectedProject.value = store.projects.find(p => p.id === projectId) || null
  }
}

function addNewUser() {
  isUserDialogOpen.value = true
}

function openGitHub() {
  if (window.electron?.openExternal) {
    window.electron.openExternal('https://github.com/kingknecht/fireplanner')
  }
}

function handleUserDialogSubmit(data: { name: string }) {
  store.addUser(data.name)
  setDirty(true)
}

function handleUserDialogClose() {
  isUserDialogOpen.value = false
}

function handleMoveProject(projectId: string, newUserId: string | null, newStartDate: Date) {
  store.updateProject(projectId, {
    userId: newUserId,
    startDate: newStartDate
  })
  setDirty(true)
  // Update selectedProject to point to the updated object from the store
  if (selectedProject.value && selectedProject.value.id === projectId) {
    selectedProject.value = store.projects.find(p => p.id === projectId) || null
  }
}

function handleDeleteUser(userId: string) {
  store.removeUser(userId)
  setDirty(true)
  // Clear selection if the deleted user's project was selected
  if (selectedProject.value && selectedProject.value.userId === userId) {
    // Refresh the selectedProject to get the updated version (now with userId: null)
    selectedProject.value = store.projects.find(p => p.id === selectedProject.value?.id) || null
  }
}
</script>

<template>
  <Toast />
  <div class="app">
    <header class="app-header">
      <div class="header-left">
        <img src="/fire_planner_512x512.png" alt="FirePlanner Logo" class="app-logo" />
        <h1>FirePlanner</h1>
        <span v-if="currentFilePath" class="current-file">
          {{ currentFilePath.split('/').pop() }}
        </span>
        <span v-else class="current-file">Untitled</span>
      </div>
      <div class="header-actions">
        <button @click="addNewUser" class="btn-header">Add User</button>
        <button @click="openGitHub" class="github-link" title="View on GitHub">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
        </button>
      </div>
    </header>

    <main class="app-main">
      <PlannerGrid
        ref="plannerGridRef"
        :users="store.users"
        :weekdays="store.weekdays"
        :get-projects-for-user="store.getProjectsForUser"
        :show-unassigned="true"
        :selected-project-id="selectedProject?.id"
        @create-project="handleCreateProject"
        @edit-project="handleEditProject"
        @move-project="handleMoveProject"
        @delete-user="handleDeleteUser"
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

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.app-header h1 {
  margin: 0;
  font-size: 24px;
}

.current-file {
  font-size: 14px;
  color: #aaa;
  font-weight: normal;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
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

.github-link {
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  background: transparent;
  border: none;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.github-link:hover {
  background: rgba(255, 255, 255, 0.1);
}

.github-link svg {
  display: block;
}

.app-main {
  flex: 1;
  overflow: hidden;
  display: flex;
}
</style>
