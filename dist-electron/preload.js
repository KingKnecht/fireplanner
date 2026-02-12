"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electron', {
    send: (channel, data) => {
        // whitelist channels
        const validChannels = ['toMain'];
        if (validChannels.includes(channel)) {
            electron_1.ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, func) => {
        const validChannels = ['fromMain', 'main-process-message', 'menu:new', 'menu:save', 'menu:open', 'menu:undo', 'menu:redo'];
        if (validChannels.includes(channel)) {
            electron_1.ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    saveFile: (data) => electron_1.ipcRenderer.invoke('dialog:saveFile', data),
    openFile: () => electron_1.ipcRenderer.invoke('dialog:openFile'),
    getConfig: () => electron_1.ipcRenderer.invoke('config:get'),
    autosave: (data) => electron_1.ipcRenderer.invoke('autosave:save', data),
});
