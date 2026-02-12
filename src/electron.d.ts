export interface AutosaveConfig {
  enabled: boolean
  intervalSeconds: number
  folder: string
}

export interface AppConfig {
  autosave: AutosaveConfig
}

export interface ElectronAPI {
  send: (channel: string, data: any) => void
  receive: (channel: string, func: (...args: any[]) => void) => void
  saveFile: (data: any) => Promise<{ success: boolean; filePath?: string }>
  openFile: () => Promise<{ success: boolean; data?: any; filePath?: string }>
  getConfig: () => Promise<AppConfig>
  autosave: (data: any) => Promise<{ success: boolean; path?: string; error?: string }>
  setTitle: (title: string) => void
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}
