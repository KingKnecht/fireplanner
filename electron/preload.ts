import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  send: (channel: string, data: any) => {
    // whitelist channels
    const validChannels = ['toMain', 'window:setTitle', 'window:setDarkMode']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  receive: (channel: string, func: (...args: any[]) => void) => {
    const validChannels = ['fromMain', 'main-process-message', 'menu:new', 'menu:save', 'menu:saveAs', 'menu:open', 'menu:openRecentFile', 'menu:undo', 'menu:redo', 'menu:toggleDarkMode']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args))
    }
  },
  saveFile: (data: any, currentFilePath?: string | null) => ipcRenderer.invoke('dialog:saveFile', data, currentFilePath),
  saveFileAs: (data: any) => ipcRenderer.invoke('dialog:saveFileAs', data),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openFilePath: (filePath: string) => ipcRenderer.invoke('dialog:openFilePath', filePath),
  getConfig: () => ipcRenderer.invoke('config:get'),
  reloadConfig: () => ipcRenderer.invoke('config:reload'),
  autosave: (data: any) => ipcRenderer.invoke('autosave:save', data),
  setTitle: (title: string) => ipcRenderer.send('window:setTitle', title),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
})
