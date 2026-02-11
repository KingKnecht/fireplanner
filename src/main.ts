import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaHistory } from 'pinia-plugin-history'
import './style.css'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()
pinia.use(PiniaHistory)

app.use(pinia)
app.mount('#app')
