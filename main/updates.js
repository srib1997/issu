/**
 * 主要
 * - 執行 autoUpdate function (main/index.js 會用到)
 *   - 會執行 startAppUpdates
 *     1. 由 config file 讀取 config.desktop.updatedFrom
 *     2. deleteUpdateConfig
 *       - 將 updatedFrom 歸零
 *     3. [傳送] 若有 updatedFrom 值, 即更新有錯誤, 傳送 'update-failed' 給 main window
 *     4. 開左 app 十秒後執行 checkForUpdates
 *     5. [事件接收] autoUpdater 收到 error的時侯，每15分鐘執行 checkForUpdate
 *       - 如果離線就每30分鐘執行一次 checkForUpdate
 *       - 否則就馬上執行 autoUpdater.checkForUpdates
 *     6. [事件接收] autoUpdater 收到 update-downloaded 的時侯
 *       - 就執行 saveconfig, 將 updatedFrom 變 appVersion
 *       - 安裝更新, restart the application
 *     7. [事件接收] autoUpdater 收到 'update-not-available' 的時候
 *       - 5分鐘後再 checkForUpdates
 */

const { app, autoUpdater } = require('electron')
const isDev = require('electron-is-dev')
const ms = require('ms')
const { version } = require('../package')
const { getConfig, saveConfig } = require('./utils/config')

const isCanary = async () => {
  const { updateChannel } = await getConfig()
  return updateChannel && updateChannel === 'canary'
}

const setUpdateURL = async () => {
  const { platform } = process

  const channel = (await isCanary()) ? 'releases-canary' : 'releases'
  const feedURL = `https://update.issu.app/${channel}/${platform}`

  try {
    autoUpdater.setFeedURL(feedURL + '/' + app.getVersion())
  } catch (error) {}
}

const checkForUpdates = async () => {
  if (process.env.CONNECTION === 'offline') {
    // Try again after half an hour
    setTimeout(checkForUpdates, ms('30m'))
    return
  }

  // Ensure we're pulling from the correct channel
  try {
    await setUpdateURL()
  } catch (error) {
    // Retry later if setting the update URL failed
    return
  }

  // Then ask the server for updates
  autoUpdater.checkForUpdates()
}

const deleteUpdateConfig = () =>
  saveConfig(
    {
      desktop: {
        updatedFrom: null
      }
    },
    'config'
  )

const startAppUpdates = async mainWindow => {
  let config

  try {
    config = await getConfig()
  } catch (error) {
    config = {}
  }

  const updatedFrom = config.desktop && config.desktop.updatedFrom
  const appVersion = isDev ? version : app.getVersion()

  // Ensure that update state gets refreshed after relaunch
  await deleteUpdateConfig()

  // If the current app version matches the old
  // app version, it's an indicator that installation
  // of the update failed
  if (updatedFrom && updatedFrom === appVersion) {
    console.error('An app update failed to install.')

    // Show a UI banner, allowing the user to retry
    mainWindow.webContents.send('update-failed')
    return
  }

  autoUpdater.on('error', error => {
    // Report errors to console. We can't report
    // to Slack and restart here, because it will
    // cause the app to never start again
    console.error(error)

    // Then check again for update after 15 minutes
    setTimeout(checkForUpdates, ms('15m'))
  })

  // Check for app update after startup
  setTimeout(checkForUpdates, ms('10s'))

  autoUpdater.on('update-downloaded', async () => {
    // Don't open the main window after re-opening
    // the app for this update. The `await` prefix is
    // important, because we need to save to config
    // before the app quits.

    // Here, we also ensure that failed update
    // installations result in a UI change that lets
    // the user retry manually.
    await saveConfig(
      {
        desktop: {
          updatedFrom: appVersion
        }
      },
      'config'
    )

    // Then restart the application
    autoUpdater.quitAndInstall()
    app.quit()
  })

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for app updates...')
  })

  autoUpdater.on('update-available', () => {
    console.log('Found update for the app! Downloading...')
  })

  autoUpdater.on('update-not-available', () => {
    console.log('No updates found. Checking again in 5 minutes...')
    setTimeout(checkForUpdates, ms('5m'))
  })
}

module.exports = mainWindow => {
  if (!isDev) {
    startAppUpdates(mainWindow)
  }
}
