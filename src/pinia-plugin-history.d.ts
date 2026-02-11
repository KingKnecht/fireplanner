declare module 'pinia-plugin-history' {
  import type { PiniaPluginContext } from 'pinia'
  
  export interface HistoryOptions {
    max?: number
    persistent?: boolean
  }

  export const PiniaHistory: (context: PiniaPluginContext) => void
}
