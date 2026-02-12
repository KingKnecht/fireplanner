import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaHistory } from 'pinia-plugin-history'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import './style.css'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()
pinia.use(PiniaHistory)

app.use(pinia)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: false
    }
  }
})
app.mount('#app')
