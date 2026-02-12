const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron')
const { promises: fs } = require('fs')
const path = require('path')

const isDev = process.env.NODE_ENV === 'development'

let win = null

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'dist-electron/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'))
  }
}

// IPC handlers for file operations
ipcMain.handle('dialog:saveFile', async (_, data) => {
  const result = await dialog.showSaveDialog({
    title: 'Save Planner',
    defaultPath: 'planner.json',
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  })

  if (!result.canceled && result.filePath) {
    await fs.writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf-8')
    return { success: true, filePath: result.filePath }
  }
  return { success: false }
})

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Open Planner',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    properties: ['openFile']
  })

  if (!result.canceled && result.filePaths.length > 0) {
    const content = await fs.readFile(result.filePaths[0], 'utf-8')
    return { success: true, data: JSON.parse(content), filePath: result.filePaths[0] }
  }
  return { success: false }
})

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Save',
          accelerator: 'CommandOrControl+S',
          click: () => {
            win?.webContents.send('menu:save')
          }
        },
        {
          label: 'Open',
          accelerator: 'CommandOrControl+O',
          click: () => {
            win?.webContents.send('menu:open')
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CommandOrControl+Z',
          click: () => {
            win?.webContents.send('menu:undo')
          }
        },
        {
          label: 'Redo',
          accelerator: 'CommandOrControl+Y',
          click: () => {
            win?.webContents.send('menu:redo')
          }
        },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.on('ready', () => {
  // Give Vite dev server time to start if in dev mode
  if (isDev) {
    setTimeout(() => {
      createMenu()
      createWindow()
    }, 2000)
  } else {
    createMenu()
    createWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
})
