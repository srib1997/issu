const { app, autoUpdater } = require('electron')
const isDev = require('electron-is-dev')
const ms = require('ms')
const log = require('electron-log')
const { version } = require('../package')
const { getConfig, saveConfig } = require('./utils/config')

const deleteUpdateConfig = () =>
  saveConfig(
    {
      desktop: {
        updatedFrom: null
      }
    },
    'config'
  )

const isCanary = async () => {
  const { updateChannel } = await getConfig()
  return updateChannel && updateChannel === 'canary'
}

const setUpdateURL = async () => {
  const { platform } = process

  const channel = (await isCanary()) ? 'releases-canary' : 'releases'
  const feedURL = `https://update.issu.app/${channel}/${platform}`
  log.error(feedURL + '/' + app.getVersion())
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
  log.error('checkForUpdates1')
  // Ensure we're pulling from the correct channel
  try {
    await setUpdateURL()
  } catch (error) {
    // Retry later if setting the update URL failed
    return
  }
  log.error('checkForUpdates2')
  // Then ask the server for updates
  autoUpdater.checkForUpdates()
}

const startAppUpdates = async mainWindow => {
  let config

  try {
    config = await getConfig()
  } catch (error) {
    config = {}
  }

  const updatedFrom = config.desktop && config.desktop.updatedFrom
  const appVersion = isDev ? version : app.getVersion()
  log.error('appVersion', appVersion)
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
    log.error('Checking for app updates...')
  })

  autoUpdater.on('update-available', () => {
    log.error('Found update for the app! Downloading...')
  })

  autoUpdater.on('update-not-available', () => {
    log.error('No updates found. Checking again in 5 minutes...')
    setTimeout(checkForUpdates, ms('5m'))
  })
}

module.exports = mainWindow => {
  if (!isDev) {
    startAppUpdates(mainWindow)
  }
}
