<template>
  <div v-if="isOpen" class="dialog-overlay" @click.self="closeDialog">
    <div class="dialog">
      <h2>{{ editingProject ? 'Edit Project' : 'Create Project' }}</h2>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Project Name:</label>
          <input v-model="form.name" type="text" required />
        </div>

        <div class="form-group">
          <label>User:</label>
          <select v-model="form.userId" required>
            <option value="">Select a user</option>
            <option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.name }}
            </option>
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
          <label>End Date:</label>
          <DatePicker 
            v-model="form.endDate" 
            dateFormat="dd.mm.yy"
            showIcon
            :showOnFocus="false"
          />
        </div>

        <div class="form-group">
          <label>Color:</label>
          <input v-model="form.color" type="color" />
        </div>

        <div class="dialog-actions">
          <button v-if="editingProject" type="button" class="btn-delete" @click="handleDelete">
            Delete
          </button>
          <button type="button" class="btn-secondary" @click="closeDialog">
            Cancel
          </button>
          <button type="submit" class="btn-primary">
            {{ editingProject ? 'Update' : 'Create' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import DatePicker from 'primevue/datepicker'
import type { User, Project } from '../types'

const props = defineProps<{
  isOpen: boolean
  users: User[]
  editingProject?: Project | null
}>()

const emit = defineEmits<{
  close: []
  submit: [data: {
    name: string
    userId: string
    startDate: Date
    endDate: Date
    color: string
  }]
  delete: []
}>()

const form = ref({
  name: '',
  userId: '',
  startDate: null as Date | null,
  endDate: null as Date | null,
  color: '#7BA3D1'
})

watch(() => props.editingProject, (project) => {
  if (project) {
    form.value = {
      name: project.name,
      userId: project.userId || '',
      startDate: new Date(project.startDate),
      endDate: new Date(project.endDate),
      color: project.color
    }
  } else {
    form.value = {
      name: '',
      userId: '',
      startDate: null,
      endDate: null,
      color: '#7BA3D1'
    }
  }
}, { immediate: true })

function closeDialog() {
  emit('close')
}

function handleSubmit() {
  if (!form.value.startDate || !form.value.endDate) return
  
  emit('submit', {
    name: form.value.name,
    userId: form.value.userId,
    startDate: form.value.startDate,
    endDate: form.value.endDate,
    color: form.value.color
  })
  closeDialog()
}

function handleDelete() {
  if (confirm('Are you sure you want to delete this project?')) {
    emit('delete')
    closeDialog()
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  padding: 24px;
  border-radius: 8px;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dialog h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #1a1a1a;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
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

.dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn-primary,
.btn-secondary,
.btn-delete {
  padding: 8px 16px;
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
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-delete {
  background: #f44336;
  color: white;
  margin-right: auto;
}

.btn-delete:hover {
  background: #da190b;
}

/* PrimeVue DatePicker styling */
:deep(.p-datepicker) {
  width: 100%;
}

:deep(.p-datepicker input) {
  width: 100%;
}
</style>
