const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron')
const { promises: fs } = require('fs')
const path = require('path')

const isDev = process.env.NODE_ENV === 'development'

let win = null
let config = null
let isDarkMode = false
let recentFiles = []  // Store recent file paths
const MAX_RECENT_FILES = 10

// Load or create config
async function loadConfig() {
  // Try to load default config from bundled file
  let defaultConfig = {
    autosave: {
      enabled: true,
      intervalSeconds: 30,
      folder: path.join(app.getPath('userData'), 'autosave')
    },
    workingDays: [1, 2, 3, 4, 5],
    customProperties: []
  }
  
  try {
    const bundledConfigPath = path.join(__dirname, 'config.json')
    const bundledData = await fs.readFile(bundledConfigPath, 'utf-8')
    const bundledConfig = JSON.parse(bundledData)
    // Merge with defaults, ensuring folder is set
    defaultConfig = {
      autosave: {
        ...bundledConfig.autosave,
        folder: bundledConfig.autosave?.folder || path.join(app.getPath('userData'), 'autosave')
      },
      workingDays: bundledConfig.workingDays || [1, 2, 3, 4, 5],
      customProperties: bundledConfig.customProperties || []
    }
  } catch (error) {
    // Bundled config doesn't exist or is invalid, use hardcoded defaults
    console.log('[Config] Using hardcoded defaults:', error.message)
  }
  
  // Store config in userData directory (writable location)
  const configPath = path.join(app.getPath('userData'), 'config.json')
  try {
    const data = await fs.readFile(configPath, 'utf-8')
    const loadedConfig = JSON.parse(data)
    
    // If folder is empty, use default
    if (!loadedConfig.autosave?.folder) {
      loadedConfig.autosave.folder = defaultConfig.autosave.folder
    }
    
    // Merge workingDays from bundled config if not present in user config
    if (!loadedConfig.workingDays) {
      loadedConfig.workingDays = defaultConfig.workingDays
    }
    
    // Merge customProperties from bundled config if not present in user config
    if (!loadedConfig.customProperties) {
      loadedConfig.customProperties = defaultConfig.customProperties
    }
    
    config = loadedConfig
  } catch (error) {
    // Config doesn't exist, create it with defaults
    config = defaultConfig
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
  }
  return config
}

// Load recent files from storage
async function loadRecentFiles() {
  try {
    const recentFilesPath = path.join(app.getPath('userData'), 'recent-files.json')
    const data = await fs.readFile(recentFilesPath, 'utf-8')
    recentFiles = JSON.parse(data)
    // Filter out files that no longer exist
    const existingFiles = []
    for (const filePath of recentFiles) {
      try {
        await fs.access(filePath)
        existingFiles.push(filePath)
      } catch {
        // File doesn't exist anymore, skip it
      }
    }
    recentFiles = existingFiles
  } catch (error) {
    // File doesn't exist or is invalid, start with empty list
    recentFiles = []
  }
}

// Save recent files to storage
async function saveRecentFiles() {
  try {
    const recentFilesPath = path.join(app.getPath('userData'), 'recent-files.json')
    await fs.writeFile(recentFilesPath, JSON.stringify(recentFiles, null, 2), 'utf-8')
  } catch (error) {
    console.error('[RecentFiles] Failed to save:', error)
  }
}

// Add a file to recent files list
async function addToRecentFiles(filePath) {
  // Remove if already in list
  recentFiles = recentFiles.filter(f => f !== filePath)
  // Add to front
  recentFiles.unshift(filePath)
  // Limit to MAX_RECENT_FILES
  if (recentFiles.length > MAX_RECENT_FILES) {
    recentFiles = recentFiles.slice(0, MAX_RECENT_FILES)
  }
  await saveRecentFiles()
  // Update menu to show new recent files
  createMenu()
}

function createWindow() {
  // Choose icon based on platform
  // Assets are in the asar in production, in the project root in dev
  let iconPath
  if (process.platform === 'win32') {
    iconPath = path.join(__dirname, 'assets', 'fire_planner_256x256.ico')
  } else if (process.platform === 'darwin') {
    iconPath = path.join(__dirname, 'assets', 'fire_planner.icns')
  } else {
    iconPath = path.join(__dirname, 'assets', 'fire_planner_512x512.png')
  }
  
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: iconPath,
    show: false,
    backgroundColor: '#f5f5f5',
    webPreferences: {
      preload: path.join(__dirname, 'dist-electron/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Show window when ready to prevent white flash
  win.once('ready-to-show', () => {
    win.show()
  })

  // Prevent close if there are unsaved changes
  win.on('close', (event) => {
    const title = win.getTitle()
    if (title.includes('*')) {
      const choice = dialog.showMessageBoxSync(win, {
        type: 'question',
        buttons: ['Cancel', 'Discard Changes'],
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Are you sure you want to quit?',
        defaultId: 0,
        cancelId: 0
      })
      
      if (choice === 0) {
        event.preventDefault()
      }
    }
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    const indexPath = path.join(__dirname, 'dist', 'index.html')
    win.loadFile(indexPath)
  }
}

// IPC handlers for file operations
ipcMain.handle('dialog:saveFile', async (_, data, currentFilePath = null) => {
  // If we have a current file path, save directly without dialog
  if (currentFilePath) {
    try {
      await fs.writeFile(currentFilePath, JSON.stringify(data, null, 2), 'utf-8')
      await addToRecentFiles(currentFilePath)
      return { success: true, filePath: currentFilePath }
    } catch (error) {
      console.error('[Save] Failed to save:', error)
      return { success: false, error: error.message }
    }
  }
  
  // No current file path, show save dialog
  const result = await dialog.showSaveDialog({
    title: 'Save Planner',
    defaultPath: 'planner.fpj',
    filters: [{ name: 'FirePlanner Files', extensions: ['fpj'] }]
  })

  if (!result.canceled && result.filePath) {
    await fs.writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf-8')
    await addToRecentFiles(result.filePath)
    return { success: true, filePath: result.filePath }
  }
  return { success: false }
})

// Save As - always shows dialog
ipcMain.handle('dialog:saveFileAs', async (_, data) => {
  const result = await dialog.showSaveDialog({
    title: 'Save Planner As',
    defaultPath: 'planner.fpj',
    filters: [{ name: 'FirePlanner Files', extensions: ['fpj'] }]
  })

  if (!result.canceled && result.filePath) {
    await fs.writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf-8')
    await addToRecentFiles(result.filePath)
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
    await addToRecentFiles(result.filePaths[0])
    return { success: true, data: JSON.parse(content), filePath: result.filePaths[0] }
  }
  return { success: false }
})

// Open a specific file path (for recent files)
ipcMain.handle('dialog:openFilePath', async (_, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    await addToRecentFiles(filePath)
    return { success: true, data: JSON.parse(content), filePath }
  } catch (error) {
    console.error('[OpenFile] Failed to open:', error)
    return { success: false, error: error.message }
  }
})

// Get config
ipcMain.handle('config:get', async () => {
  return config
})

// Reload config from disk
ipcMain.handle('config:reload', async () => {
  try {
    await loadConfig()
    console.log('[Config] Reloaded from disk')
    return { success: true, config }
  } catch (error) {
    console.error('[Config] Failed to reload:', error)
    return { success: false, error: error.message }
  }
})

// Set window title
ipcMain.on('window:setTitle', (_, title) => {
  if (win) {
    win.setTitle(title)
  }
})

// Update dark mode state
ipcMain.on('window:setDarkMode', (_, darkMode) => {
  isDarkMode = darkMode
  // Update window background color to match theme
  if (win) {
    win.setBackgroundColor(darkMode ? '#1a1a1a' : '#f5f5f5')
  }
  createMenu()
})

// Open external URL in default browser
ipcMain.handle('shell:openExternal', async (_, url) => {
  const { shell } = require('electron')
  await shell.openExternal(url)
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
function showAboutDialog() {
  const packageInfo = require('./package.json')
  
  dialog.showMessageBox(win, {
    type: 'info',
    title: 'About FirePlanner',
    message: `FirePlanner v${packageInfo.version}`,
    detail: `${packageInfo.description}\n\n` +
            `Author: ${packageInfo.author}\n` +
            `License: ${packageInfo.license || 'Not specified'}\n\n` +
            `Built with Electron ${process.versions.electron}\n` +
            `Chromium ${process.versions.chrome}\n` +
            `Node.js ${process.versions.node}\n` +
            `V8 ${process.versions.v8}`,
    buttons: ['OK']
  })
}

function createMenu() {
  // Build recent files submenu
  const recentFilesSubmenu = recentFiles.length > 0
    ? recentFiles.map(filePath => ({
        label: path.basename(filePath),
        click: () => {
          win?.webContents.send('menu:openRecentFile', filePath)
        }
      }))
    : [{ label: 'No recent files', enabled: false }]

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
          label: 'Save As...',
          accelerator: 'CommandOrControl+Shift+S',
          click: () => {
            win?.webContents.send('menu:saveAs')
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
        {
          label: 'Recent Files',
          submenu: recentFilesSubmenu
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
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: isDarkMode ? 'Toggle Light Mode' : 'Toggle Dark Mode',
          accelerator: 'CommandOrControl+D',
          click: () => {
            win?.webContents.send('menu:toggleDarkMode')
          }
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            showAboutDialog()
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.on('ready', async () => {
  // Load config and recent files
  await loadConfig()
  await loadRecentFiles()
  
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
