// // Packages
// const electron = require('electron')
// const isDev = require('electron-is-dev')
// const fixPath = require('fix-path')
// const prepareNext = require('electron-next')
// const { resolve: resolvePath } = require('app-root-path')
// const squirrelStartup = require('electron-squirrel-startup')
// const Sentry = require('@sentry/electron')

// // Sentry 啟動
// Sentry.init({
//   dsn: 'https://c8371db438994884a56ff32199f5f4ba@sentry.io/1364904'
// })

// // 當 squirrel 開緊個時就馬上關閉此程式
// // Immediately quit the app if squirrel is launching it
// if (squirrelStartup) {
//   electron.app.quit()
// }

// // 防止垃圾記憶體回收
// // Prevent garbage collection
// // 否則個 tray icon 會有時唔見左
// // Otherwise the tray icon would randomly hide after some time
// let tray = null

// // 一開始一開 window 時不用檢查 login status
// // Prevent having to check for login status when opening the window
// let loggedIn = null

// // 馬上檢查登入狀態
// // 之後每兩秒檢查一次, 檢查 config 裡有沒有 token
// // Check status once in the beginning when the app starting up
// // And then every 2 seconds
// // We could to this on click on the tray icon, but we
// // don't want to block that action
// const setLoggedInStatus = async () => {
//   let token

//   try {
//     const config = await getConfig()
//     token = config.token
//   } catch (error) {}

//   loggedIn = Boolean(token)
//   setTimeout(setLoggedInStatus, 2000)
// }
// // 馬上檢查，但會等候個 app 完全開啟個時先會。因為這是 async function。
// setLoggedInStatus()

// // 由 electron 載入 app
// // Load the app instance from electron
// const { app } = electron

// // 設定 app name
// // Set the application's name
// app.setName('Issu')

// // 當有錯誤處理時, 就會執行 handleException
// // Handle uncaught exceptions
// process.on('uncaughtException', handleException)

// // 當 dev 時, hide dock icon
// // Hide dock icon before the app starts
// // This is only required for development because
// // we're setting a property on the bundled app
// // in production, which prevents the icon from flickering
// if (isDev && process.platform === 'darwin') {
//   app.dock.hide()
// }

// // 檢查是否第一次運行
// const isFirstRun = firstRun()

// // 若為第一次運行, 需要設為開機時開啟程式
// // Make Now start automatically on login
// if (!isDev && isFirstRun) {
//   app.setLoginItemSettings({
//     openAtLogin: true
//   })
// }

// // 每個人裝的位都不一樣
// // 確定繼承正確路徑的位置
// // 在捆綁的應用程序中，路徑會有所不同
// // Makes sure where inheriting the correct path
// // Within the bundled app, the path would otherwise be different
// fixPath()

// // 當所有視槍關的時候，你個 system 唔係 Mac 的時氤，你個 App 就會刪佐
// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') {
//     app.quit()
//   }
// })

// // 依個係一個 async function, 視父你有無上線去決定你個右键 Menu
// const contextMenu = async (windows, inRenderer) => {
//   if (process.env.CONNECTION === 'offline') {
//     return outerMenu(app, windows)
//   }

//   return innerMenu(app, tray, windows, inRenderer)
// }

// // Chrome 的 setting
// // Chrome Command Line Switches
// app.commandLine.appendSwitch('disable-renderer-backgrounding')

// app.on('ready', async () => {
//   // Config 一開始係一個空的 object
//   let config = {}

//   // 開始讀取 config, 如果讀唔到的話就係一個空的 object
//   try {
//     config = await getConfig()
//   } catch (error) {
//     config = {}
//   }

//   // 定義一個 BrowserWindow 用黎偵測上網 status
//   const onlineStatusWindow = new electron.BrowserWindow({
//     width: 0,
//     height: 0,
//     show: false
//   })

//   // 載入一個 status html
//   // status.html 入面會偵測上網 status,
//   // 然後會籍由 online-status-changed 事件同 index.js 溝通
//   onlineStatusWindow.loadURL(
//     'file://' + resolvePath('./main/static/pages/status.html')
//   )

//   // 當 index.js 收到依個事件之後，就將上網 status 存到 process.env.CONNECTION
//   // process.env.CONNECTION 的改變右键 Menu
//   electron.ipcMain.on('online-status-changed', (event, status) => {
//     process.env.CONNECTION = status
//   })
// })

// const loadPage = (win, page) => {
//   if (isDev) {
//     win.loadURL(`http://localhost:8000/${page}`)
//   } else {
//     win.loadFile(`${app.getAppPath()}/renderer/out/${page}/index.html`)
//   }
// }

// // Keep a global reference of the window object, if you don't, the window will
// // be closed automatically when the JavaScript object is garbage collected.
// let mainWindow

// async function createWindow() {
//   // Ensure that `next` works with `electron`
//   try {
//     await prepareNext('./renderer')
//   } catch (error) {
//     // Next has failed to start but context menu should still work
//   }

//   // Create the browser window.
//   mainWindow = new BrowserWindow({ width: 800, height: 600 })

//   loadPage(mainWindow, 'feed')

//   autoUpdater(mainWindow)

//   // Emitted when the window is closed.
//   mainWindow.on('closed', () => {
//     // Dereference the window object, usually you would store windows
//     // in an array if your app supports multi windows, this is the time
//     // when you should delete the corresponding element.
//     mainWindow = null
//   })
// }

// // This method will be called when Electron has finished
// // initialization and is ready to create browser windows.
// // Some APIs can only be used after this event occurs.
// app.on('ready', createWindow)

// // Quit when all windows are closed.
// app.on('window-all-closed', () => {
//   app.quit()
// })

// app.on('activate', () => {
//   // On macOS it's common to re-create a window in the app when the
//   // dock icon is clicked and there are no other windows open.
//   if (mainWindow === null) {
//     createWindow()
//   }
// })

// // In this  file you can include the rest of your app's specific main process
// // code. You can also put them in separate files and require them here.
