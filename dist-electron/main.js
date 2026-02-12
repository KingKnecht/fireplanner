import { app, ipcMain, dialog, BrowserWindow, Menu } from "electron";
import { promises } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.DIST = path.join(__dirname$1, "../dist");
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.on("did-finish-load", () => {
      win?.webContents.openDevTools();
    });
  } else {
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
}
ipcMain.handle("dialog:saveFile", async (_, data) => {
  const result = await dialog.showSaveDialog({
    title: "Save Planner",
    defaultPath: "planner.json",
    filters: [{ name: "JSON Files", extensions: ["json"] }]
  });
  if (!result.canceled && result.filePath) {
    await promises.writeFile(result.filePath, JSON.stringify(data, null, 2), "utf-8");
    return { success: true, filePath: result.filePath };
  }
  return { success: false };
});
ipcMain.handle("dialog:openFile", async () => {
  const result = await dialog.showOpenDialog({
    title: "Open Planner",
    filters: [{ name: "JSON Files", extensions: ["json"] }],
    properties: ["openFile"]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const content = await promises.readFile(result.filePaths[0], "utf-8");
    return { success: true, data: JSON.parse(content), filePath: result.filePaths[0] };
  }
  return { success: false };
});
function createMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Save",
          accelerator: "CommandOrControl+S",
          click: () => {
            win?.webContents.send("menu:save");
          }
        },
        {
          label: "Open",
          accelerator: "CommandOrControl+O",
          click: () => {
            win?.webContents.send("menu:open");
          }
        },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    {
      label: "Edit",
      submenu: [
        {
          label: "Undo",
          accelerator: "CommandOrControl+Z",
          click: () => {
            win?.webContents.send("menu:undo");
          }
        },
        {
          label: "Redo",
          accelerator: "CommandOrControl+Y",
          click: () => {
            win?.webContents.send("menu:redo");
          }
        },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
app.whenReady().then(() => {
  createMenu();
  createWindow();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
