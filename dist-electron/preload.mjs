"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  send: (channel, data) => {
    const validChannels = ["toMain"];
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    const validChannels = ["fromMain", "main-process-message", "menu:save", "menu:open", "menu:undo", "menu:redo"];
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  saveFile: (data) => electron.ipcRenderer.invoke("dialog:saveFile", data),
  openFile: () => electron.ipcRenderer.invoke("dialog:openFile")
});
