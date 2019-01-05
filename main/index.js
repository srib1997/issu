// Modules to control application life and create native browser window
const { app, BrowserWindow } = require('electron')
const prepareNext = require('electron-next')
const isDev = require('electron-is-dev')
const Sentry = require('@sentry/electron')
const autoUpdater = require('./updates')

Sentry.init({
  dsn: 'https://c8371db438994884a56ff32199f5f4ba@sentry.io/1364904'
})

const loadPage = (win, page) => {
  if (isDev) {
    win.loadURL(`http://localhost:8000/${page}`)
  } else {
    win.loadFile(`${app.getAppPath()}/renderer/out/${page}/index.html`)
  }
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

async function createWindow() {
  // Ensure that `next` works with `electron`
  try {
    await prepareNext('./renderer')
  } catch (error) {
    // Next has failed to start but context menu should still work
  }

  // Create the browser window.
  mainWindow = new BrowserWindow({ width: 800, height: 600 })

  loadPage(mainWindow, 'feed')

  autoUpdater(mainWindow)

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this  file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
