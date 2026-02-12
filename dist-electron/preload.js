import { contextBridge, ipcRenderer } from 'electron';
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
    send: (channel, data) => {
        // whitelist channels
        const validChannels = ['toMain'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, func) => {
        const validChannels = ['fromMain', 'main-process-message', 'menu:save', 'menu:open', 'menu:undo', 'menu:redo'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    saveFile: (data) => ipcRenderer.invoke('dialog:saveFile', data),
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
});
