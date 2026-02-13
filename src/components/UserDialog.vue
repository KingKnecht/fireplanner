<template>
  <div v-if="isOpen" class="dialog-overlay" @click.self="closeDialog">
    <div class="dialog">
      <h2>Add User</h2>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>User Name:</label>
          <input v-model="form.name" type="text" required autofocus />
        </div>

        <div class="dialog-actions">
          <button type="button" class="btn-secondary" @click="closeDialog">
            Cancel
          </button>
          <button type="submit" class="btn-primary">
            Add User
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [data: { name: string }]
}>()

const form = ref({
  name: ''
})

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    form.value = {
      name: ''
    }
  }
})

function closeDialog() {
  emit('close')
}

function handleSubmit() {
  if (form.value.name.trim()) {
    emit('submit', {
      name: form.value.name.trim()
    })
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

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn-primary,
.btn-secondary {
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

</style>

<style>
/* Dark mode styles - non-scoped */
.dark-mode .dialog-overlay {
  background: rgba(0, 0, 0, 0.7);
}

.dark-mode .dialog {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
}

.dark-mode .dialog h2 {
  color: #e0e0e0;
}

.dark-mode .form-group label {
  color: #b0b0b0;
}

.dark-mode .form-group input {
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  color: #e0e0e0;
}

.dark-mode .form-group input:focus {
  border-color: #4CAF50;
}

.dark-mode .btn-secondary {
  background: #2a2a2a;
  color: #e0e0e0;
}

.dark-mode .btn-secondary:hover {
  background: #3a3a3a;
}
</style>
