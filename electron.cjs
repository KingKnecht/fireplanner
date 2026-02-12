const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron')
const { promises: fs } = require('fs')
const path = require('path')

const isDev = process.env.NODE_ENV === 'development'

let win = null
let config = null

// Load or create config
async function loadConfig() {
  // Default configuration with proper userData path
  const defaultConfig = {
    autosave: {
      enabled: true,
      intervalSeconds: 30,
      folder: path.join(app.getPath('userData'), 'autosave')
    }
  }
  
  const configPath = path.join(__dirname, 'config.json')
  try {
    const data = await fs.readFile(configPath, 'utf-8')
    const loadedConfig = JSON.parse(data)
    
    // If folder is empty, use default
    if (!loadedConfig.autosave?.folder) {
      loadedConfig.autosave.folder = defaultConfig.autosave.folder
    }
    
    config = loadedConfig
  } catch (error) {
    // Config doesn't exist, create it with defaults
    config = defaultConfig
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
  }
  return config
}

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
    defaultPath: 'planner.fpj',
    filters: [{ name: 'FirePlanner Files', extensions: ['fpj'] }]
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
    filters: [{ name: 'FirePlanner Files', extensions: ['fpj'] }],
    properties: ['openFile']
  })

  if (!result.canceled && result.filePaths.length > 0) {
    const content = await fs.readFile(result.filePaths[0], 'utf-8')
    return { success: true, data: JSON.parse(content), filePath: result.filePaths[0] }
  }
  return { success: false }
})

// Get config
ipcMain.handle('config:get', async () => {
  return config
})

// Autosave handler
ipcMain.handle('autosave:save', async (_, data) => {
  console.log('[Autosave] Handler triggered, folder:', config.autosave.folder)
  try {
    const autosaveFolder = config.autosave.folder
    const archiveFolder = path.join(autosaveFolder, 'archive')
    const autosavePath = path.join(autosaveFolder, 'autosave.fpj')
    
    console.log('[Autosave] Creating folder:', autosaveFolder)
    // Create autosave folder if it doesn't exist
    await fs.mkdir(autosaveFolder, { recursive: true })
    
    // Check if autosave.fpj already exists
    try {
      await fs.access(autosavePath)
      // File exists, archive it
      console.log('[Autosave] Archiving existing autosave.fpj')
      await fs.mkdir(archiveFolder, { recursive: true })
      
      const now = new Date()
      const timestamp = now.toISOString().replace(/[:.]/g, '-').split('.')[0]
      const archiveName = `autosave_${timestamp}.fpj`
      const archivePath = path.join(archiveFolder, archiveName)
      
      await fs.rename(autosavePath, archivePath)
      console.log('[Autosave] Archived to:', archivePath)
    } catch {
      // File doesn't exist, no need to archive
      console.log('[Autosave] No existing autosave to archive')
    }
    
    // Write new autosave
    await fs.writeFile(autosavePath, JSON.stringify(data, null, 2), 'utf-8')
    console.log('[Autosave] Saved to:', autosavePath)
    return { success: true, path: autosavePath }
  } catch (error) {
    console.error('[Autosave] Failed:', error)
    return { success: false, error: error.message }
  }
})

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CommandOrControl+N',
          click: () => {
            win?.webContents.send('menu:new')
          }
        },
        { type: 'separator' },
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

app.on('ready', async () => {
  // Load config
  await loadConfig()
  
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
