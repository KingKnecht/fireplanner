import type { CustomPropertyDefinition } from './types'

export interface AutosaveConfig {
  enabled: boolean
  intervalSeconds: number
  folder: string
}

export interface AppConfig {
  autosave: AutosaveConfig
  workingDays?: number[]
  customProperties?: CustomPropertyDefinition[]
}

export interface ElectronAPI {
  send: (channel: string, data: any) => void
  receive: (channel: string, func: (...args: any[]) => void) => void
  saveFile: (data: any) => Promise<{ success: boolean; filePath?: string }>
  openFile: () => Promise<{ success: boolean; data?: any; filePath?: string }>
  openFilePath: (filePath: string) => Promise<{ success: boolean; data?: any; filePath?: string; error?: string }>
  getConfig: () => Promise<AppConfig>
  reloadConfig: () => Promise<{ success: boolean; config?: AppConfig; error?: string }>
  autosave: (data: any) => Promise<{ success: boolean; path?: string; error?: string }>
  setTitle: (title: string) => void
  openExternal: (url: string) => Promise<void>
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}
