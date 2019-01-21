/**
 * 主要
 * - 變量 loggedIn 會每兩秒會 check 一次, 看看 config 有沒有 token 的值
 *   - 會改變 toggleActivity 時選擇 tutorial 還是 main window
 *   - tray 按右鍵時會選擇那一個 contextMenu
 * - process.env.CONNECTION
 *   - 在 electron.ipcMain.on('online-status-changed') 時會設置這個值
 *   - 誰傳送 'online-status-changed'? status.html 會根據瀏覽器的上網狀態來傳送
 *   - 會影響 contextMenu return outerMenu 還是 innerMenu
 *     - tray 按右鍵時
 *     - electron.ipcMain.on('open-menu') 時, switcher 設置按鈕傳送的
 * - 執行 autoUpdater
 *   - startAppUpdates
 * - 執行 watchConfig
 *   - [事件接收] config 檔案有變更時, configWatcher.on('change')
 *     - 執行 configChanged
 *       - [傳送] send 'config-changed' to main window
 *         - 在 main window 中, switcher 和 feed 都會收到
 *         - switcher 中, 收到 'config-changed' 事件後
 *           - 會重新 load teams
 *         - [我們無要到] feed 中, 收到 'config-changed' 事件後
 *           - 將 scope, events, teams 歸零
 *   - [事件接收] config 檔案刪除時, configWatcher.on('unlink')
 *     - logout('config-removed')
 *       - remove config file
 *       - show tutorial window
 *       - notify 'Logged Oout'
 * - [事件接收] electron.ipcMain.on('online-status-changed') 接收事件
 *   - status.html 會根據瀏覽器的上網狀態來傳送
 * - [事件接收] electron.ipcMain.on('open-menu') 接收事件
 *   - switcher 設置按鈕傳送的
 * - [傳送] subscribe 系統的 AppleInterfaceThemeChangedNotification 事件
 *   - 傳送 'theme-changed' 給 main window [事件接收]
 *   - 傳送 'theme-changed' 給 about window [事件接收]
 * - 第一次運行
 *   - 如果不是電腦自動開啟和不是更新未完成，彈 tutorial window
 * - 不是第一次運行
 *   - 如果 main 處於隱藏狀態和不是電腦自動開啟和不是更新未完成, 彈 main window
 */

// Packages
const electron = require('electron')
const isDev = require('electron-is-dev')
const fixPath = require('fix-path')
const prepareNext = require('electron-next')
const { resolve: resolvePath } = require('app-root-path')
const squirrelStartup = require('electron-squirrel-startup')
const Sentry = require('@sentry/electron')

// Utilities
const firstRun = require('./utils/first-run')
const { outerMenu, innerMenu } = require('./menu')
const { getConfig, watchConfig } = require('./utils/config')
const { exception: handleException } = require('./utils/error')
const autoUpdater = require('./updates')
const toggleWindow = require('./utils/frames/toggle')
const windowList = require('./utils/frames/list')

// Sentry 啟動
Sentry.init({
  dsn: 'https://c8371db438994884a56ff32199f5f4ba@sentry.io/1364904'
})

// Notes(comus):
// 为了使最后的安装包能够实现自动更新，我们需要对现有的应用做一些改动，使它可以处理一些启动或者安装时的事件。
// 它的代码只有短短几十行，做的事情也很简单，注意返回值为true的那几行，
// 基本上来说就是安装时，更新完成时，卸载时都会被调用，我们需要根据不同的情况做不同的事情，
// 完成这些事情后不要启动应用（会出错），直接退出就好。
// Immediately quit the app if squirrel is launching it
if (squirrelStartup) {
  electron.app.quit()
}

// 防止垃圾記憶體回收
// Prevent garbage collection
// 否則個 tray icon 會有時唔見左
// Otherwise the tray icon would randomly hide after some time
let tray = null

// 一開始一開 window 時不用檢查 login status
// Prevent having to check for login status when opening the window
let loggedIn = null

// Notes(comus):
// call 這個 function 會馬上檢查 config file 內有沒有 token
// 有 token set loggedIn = true 代表已登入
const getLoggedInStatus = async () => {
  let token

  try {
    const config = await getConfig()
    token = config.token
  } catch (error) {}

  loggedIn = Boolean(token)
  return loggedIn
}

// 馬上檢查登入狀態
// 馬上檢查，但會等候個 app 完全開啟個時先會。因為這是 async function。
// 之後每兩秒檢查一次, 檢查 config 裡有沒有 token
// Check status once in the beginning when the app starting up
// And then every 2 seconds
// We could to this on click on the tray icon, but we
// don't want to block that action
const setLoggedInStatus = async () => {
  await getLoggedInStatus()
  setTimeout(setLoggedInStatus, 2000)
}
setLoggedInStatus()

// 由 electron 載入 app
// Load the app instance from electron
const { app } = electron

// 設定 app name
// Set the application's name
app.setName('Issu')

// 當有錯誤處理時, 就會執行 handleException
// Handle uncaught exceptions
process.on('uncaughtException', handleException)

// 當 dev 時, hide dock icon
// Hide dock icon before the app starts
// This is only required for development because
// we're setting a property on the bundled app
// in production, which prevents the icon from flickering
if (isDev && process.platform === 'darwin') {
  app.dock.hide()
}

// 檢查是否第一次運行
const isFirstRun = firstRun()

// 若為第一次運行, 需要設為開機時開啟程式
// Make Now start automatically on login
if (!isDev && isFirstRun) {
  app.setLoginItemSettings({
    openAtLogin: true
  })
}

// 每個人裝的位都不一樣
// 確定繼承正確路徑的位置
// 在捆綁的應用程序中，路徑會有所不同
// Makes sure where inheriting the correct path
// Within the bundled app, the path would otherwise be different
fixPath()

// 當所有視槍關的時候，你個 system 唔係 Mac 的時氤，你個 App 就會刪佐
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 依個係一個 async function, 視乎你有無上線去決定你個右键 Menu
const contextMenu = async (windows, inRenderer) => {
  if (process.env.CONNECTION === 'offline') {
    return outerMenu(app, windows)
  }
  // Intermenu
  return innerMenu(app, tray, windows, inRenderer)
}

// Chrome 的 setting
// Chrome Command Line Switches
app.commandLine.appendSwitch('disable-renderer-backgrounding')

app.on('ready', async () => {
  // Config 一開始係一個空的 object
  let config = {}

  // 開始讀取 config, 如果讀唔到的話就係一個空的 object
  try {
    config = await getConfig()
  } catch (error) {
    config = {}
  }

  // 定義一個 BrowserWindow 用黎偵測上網 status
  const onlineStatusWindow = new electron.BrowserWindow({
    width: 0,
    height: 0,
    show: false
  })

  // 載入一個 status html
  // status.html 入面會偵測上網 status,
  // 然後會籍由 online-status-changed 事件同 index.js 溝通
  onlineStatusWindow.loadURL(
    'file://' + resolvePath('./main/static/pages/status.html')
  )

  // 當 index.js 收到依個事件之後，就將上網 status 存到 process.env.CONNECTION
  // process.env.CONNECTION 的改變右键 Menu
  electron.ipcMain.on('online-status-changed', (event, status) => {
    process.env.CONNECTION = status
  })

  // 唔知講乜
  // 而家知知地
  // 1. 運行 const { app } = electron
  // 2. 之後運行 setLoggedInStatus
  // 3. 之後先再運行 app.on('ready' ...)
  // 我地 create tray icon 是在 ready 裡面, 所以已經確保 check 過 login 了
  // DO NOT create the tray icon BEFORE the login status has been checked!
  // Otherwise, the user will start clicking...
  // ...the icon and the app wouldn't know what to do

  // I have no idea why, but path.resolve doesn't work here
  // 根據唔同的 system 去換 tray 的 icon

  try {
    const iconName =
      process.platform === 'win32'
        ? 'iconWhite'
        : process.platform === 'linux'
        ? 'iconWhite'
        : 'iconTemplate'
    tray = new electron.Tray(resolvePath(`./main/static/tray/${iconName}.png`))
  } catch (error) {
    handleException(error)
    return
  }

  // Opening the context menu after login should work
  // 準備搞 tray 的 context menu
  global.tray = tray

  // Ensure that `next` works with `electron`
  // 準備 next 的 page 在 './renderer'
  try {
    await prepareNext('./renderer')
  } catch (error) {
    // Next has failed to start but context menu should still work
  }

  // Extract each window out of the list
  // 向 windowList 拿了3個 windows
  const { mainWindow, tutorialWindow, aboutWindow } = windowList

  // And then put it back into a list :D
  // 將3個拿了出來的 window 放入 windows
  const windows = {
    main: mainWindow(tray),
    tutorial: tutorialWindow(tray),
    about: aboutWindow(tray)
  }

  // Provide application and the CLI with automatic updates
  // 自動更新
  autoUpdater(windows.main)

  // Make the window instances accessible from everywhere
  // 將 windows 放入 global
  global.windows = windows

  // Listen to changes inside .now.json
  // This needs to be called AFTER setting global.windows
  // 不斷看 config 檔案(~/.issu/config.json)有沒有更改
  await watchConfig()

  // 同右鍵出黎的 menu 差唔多
  // 首頁3橫的 menu 事件
  electron.ipcMain.on('open-menu', async (event, bounds) => {
    if (bounds && bounds.x && bounds.y) {
      bounds.x = parseInt(bounds.x.toFixed(), 10) + bounds.width / 2
      bounds.y = parseInt(bounds.y.toFixed(), 10) - bounds.height / 2

      const menu = await contextMenu(windows, true)

      menu.popup({
        x: bounds.x,
        y: bounds.y
      })
    }
  })

  // 看一看如果你是 mac system,無論有無開 darkmode都會反回 boolean
  // true／false: main 和 about 的 window 會收到一個 theme-changed 事件
  if (process.platform === 'darwin') {
    electron.systemPreferences.subscribeNotification(
      'AppleInterfaceThemeChangedNotification',
      () => {
        const darkMode = electron.systemPreferences.isDarkMode()

        windows.main.send('theme-changed', { darkMode })
        windows.about.send('theme-changed', { darkMode })
      }
    )
  }

  // 這是一個 async function (未被 call, 先定義 function 姐)
  // 開／關主要視窗
  // 主要視窗根據係咪登入去放 window 的視窗
  // 如果有登入就去 windows.main，無就 windows.tutorial
  const toggleActivity = async event => {
    await getLoggedInStatus()

    if (loggedIn) {
      toggleWindow(event || null, windows.main, tray)
      return
    }

    toggleWindow(event || null, windows.tutorial)
  }

  // Only allow one instance of Now running
  // at the same time
  // 只可以開一個程式
  const gotInstanceLock = app.requestSingleInstanceLock()

  // 如果有錯誤, 即請求唔到 instanceLock, 就 close app
  if (!gotInstanceLock) {
    // We're using `exit` because `quit` didn't work
    // on Windows (tested by matheus)
    return app.exit()
  }

  // 開第二次程式的時候，都會顯示回第一個視窗
  app.on('second-instance', toggleActivity)

  // Check 系統登入時開啟程式的設定
  const { wasOpenedAtLogin } = app.getLoginItemSettings()
  // 問: 幾時 config.desktop.updatedFrom 會有值?
  // 答:
  // 1. deleteUpdateConfig call 完 updatedFrom 就係 null
  // 咁 deleteUpdateConfig 幾時會被 call 呢?
  // 重新確保在重新啟動後刷新更新狀態
  // app-ready 的時候就會用這 function
  // 2. 收到'update-downloaded'後就有 saveConfig call 完就有值
  const afterUpdate = config.desktop && config.desktop.updatedFrom

  // 「註」:在這裡主要為了解決一個問題, 就是這個 app 一開啟時，要不要 show 個 window 出來比人睇睇先
  // 問：第一次執行時要做乜？
  // 答：若果
  // 1. 這個程式不是不自動開機時開的，是用戶自己手動開的
  // 2. 這個程式未被更新時
  // 'ready-to-show' 事件是當個 window 準備好，但又未未 show 過時，就會執行入面的 function
  // 當個 window 已經 show 過一次就唔會再執行這個 function
  // 就執行 toggleActivity function
  // 在這裡的全部意思是當用戶下載完 app 第一次開時就會馬上 show tutorial window
  if (isFirstRun) {
    // Show the tutorial as soon as the content has finished rendering
    // This avoids a visual flash
    if (!wasOpenedAtLogin && !afterUpdate) {
      windows.tutorial.once('ready-to-show', toggleActivity)
    }
  } else {
    // 若果不是第一次執行'
    const mainWindow = windows.main

    // 1. !mainWindow.isVisible(): 如果窗口不是顯示的時候
    // 2. !wasOpenedAtLogin: 是用户手動開的，不是電腦自動開的
    // 3. !afterUpdate: app-ready的時候
    if (!mainWindow.isVisible() && !wasOpenedAtLogin && !afterUpdate) {
      // 就開個 window 比人睇
      mainWindow.once('ready-to-show', toggleActivity)
    }
  }

  // 如果你按一／二下的時候就會開或者關窗口
  tray.on('click', toggleActivity)
  tray.on('double-click', toggleActivity)

  // Submenu 是否有顯示呢？一開始沒有
  let submenuShown = false

  // 按右鍵的時候
  // 1. 如果顯示主視窗的時候，按右鍵就會收埋主視窗
  // 2. 如果主視窗不是顯示狀態的時候
  //    - 登入左: contextMenu
  //    - 未登入: outerMenu
  tray.on('right-click', async event => {
    if (windows.main.isVisible()) {
      windows.main.hide()
      return
    }

    const menu = loggedIn ? await contextMenu(windows) : outerMenu(app, windows)

    // Toggle submenu
    tray.popUpContextMenu(submenuShown ? null : menu)
    submenuShown = !submenuShown

    event.preventDefault()
  })
})
