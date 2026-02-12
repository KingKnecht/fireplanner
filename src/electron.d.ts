export interface ElectronAPI {
  send: (channel: string, data: any) => void
  receive: (channel: string, func: (...args: any[]) => void) => void
  saveFile: (data: any) => Promise<{ success: boolean; filePath?: string }>
  openFile: () => Promise<{ success: boolean; data?: any; filePath?: string }>
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}
