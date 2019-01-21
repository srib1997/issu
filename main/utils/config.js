/**
 * 主要
 * 1. 滙出 getConfig
 * 2. 滙出 removeConfig
 * 3. 滙出 saveConfig
 * 4. 滙出 watchConfig
 *   - [事件接收] config 檔案有變更時, configWatcher.on('change')
 *     - 執行 configChanged
 *       - [傳送] send 'config-changed' to main window
 *         - 在 main window 中, switcher 和 feed 都會收到
 *         - switcher 中, 收到 'config-changed' 事件後
 *           - 會重新 load teams
 *         - [我們無要到] feed 中, 收到 'config-changed' 事件後
 *           - 將 scope, events, teams 歸零
 */

// Native
const path = require('path')
const { homedir } = require('os')

// Packages
const fs = require('fs-extra')
const deepExtend = require('deep-extend')
const groom = require('groom')
const pathExists = require('path-exists')
const { watch } = require('chokidar')

const paths = {
  auth: '.issu/auth.json',
  config: '.issu/config.json'
}

for (const file in paths) {
  if (!{}.hasOwnProperty.call(paths, file)) {
    continue
  }

  paths[file] = path.join(homedir(), paths[file])
}

let configWatcher = null
let oldToken = null

const hasConfig = async () => {
  if (!(await pathExists(paths.auth))) {
    return false
  }

  if (!(await pathExists(paths.config))) {
    return false
  }

  return true
}

exports.getConfig = async () => {
  const content = {}
  let authContent = null
  let config = null

  try {
    authContent = await fs.readJSON(paths.auth)
    config = await fs.readJSON(paths.config)
  } catch (error) {}

  let token = null

  if (authContent) {
    token = authContent.token
  }

  const tokenProp = token ? { token } : {}

  Object.assign(content, config || {}, tokenProp)

  if (typeof content.currentTeam === 'object') {
    content.currentTeam = content.currentTeam.id
  }

  if (!content.token) {
    // Throw new Error('No user token defined')
  }

  return content
}

exports.removeConfig = async () => {
  // Stop watching the config file
  if (configWatcher) {
    configWatcher.close()

    // Reset the watcher state back to none
    configWatcher = null
  }

  const toRemove = ['currentTeam', 'user', 'sh']

  const configContent = await fs.readJSON(paths.config)

  for (const item of toRemove) {
    delete configContent[item]
  }

  await fs.writeJSON(paths.config, configContent, {
    spaces: 2
  })

  const authContent = await fs.readJSON(paths.auth)
  const comment = authContent._ ? `${authContent._}` : null
  const newAuthContent = {}

  if (comment) {
    newAuthContent._ = comment
  }

  await fs.writeJSON(paths.auth, newAuthContent, {
    spaces: 2
  })
}

exports.saveConfig = async (data, type) => {
  const destination = paths[type]
  let currentContent = {}

  try {
    currentContent = await fs.readJSON(destination)
  } catch (error) {}

  if (type === 'config') {
    if (data.currentTeam !== null && typeof data.currentTeam === 'object') {
      data.currentTeam = data.currentTeam.id
    }

    if (!currentContent._) {
      currentContent._ = 'This is your Issu config file.'
      currentContent.updateChannel = 'stable'
    }

    // Merge new data with the existing
    currentContent = deepExtend(currentContent, data)

    // Remove all the data that should be removed (like `null` props)
    currentContent = groom(currentContent)

    // And ensure that empty objects are also gone
    for (const newProp in data) {
      if (!{}.hasOwnProperty.call(data, newProp)) {
        continue
      }

      const propContent = currentContent[newProp]
      const isObject = typeof propContent === 'object'

      // Ensure that there are no empty objects inside the config
      if (isObject && Object.keys(propContent).length === 0) {
        delete currentContent[newProp]
      }
    }
  } else if (type === 'auth') {
    if (!currentContent._) {
      currentContent._ = "This is your Issu credentials file. DON'T SHARE!"
    }

    Object.assign(currentContent, data)
  }

  // Create all the directories
  await fs.ensureFile(destination)

  // Update config file
  await fs.writeJSON(destination, currentContent, {
    spaces: 2
  })
}

const configChanged = async file => {
  if (!global.windows || !configWatcher) {
    return
  }

  // We use the global `windows` list so that we can
  // call this method from the renderer without having to pass
  // the windows
  const mainWindow = global.windows.main
  const name = path.basename(file)

  let content

  try {
    content = await exports.getConfig()
  } catch (error) {
    console.error(error)
    return
  }

  if (name === 'auth.json' && oldToken !== content.token) {
    content.user = false
    console.log('Token has changed')
  }

  oldToken = content.token

  mainWindow.webContents.send('config-changed', content)
}

exports.watchConfig = async () => {
  const toWatch = [paths.auth, paths.config]

  if (!(await hasConfig())) {
    return
  }

  // Load this Issu, because it otherwise doesn't work
  const logout = require('./logout')

  // Start watching the config file and
  // inform the renderer about changes inside it
  configWatcher = watch(toWatch)
  configWatcher.on('change', file => configChanged(file))

  // Log out when a config file is removed
  configWatcher.on('unlink', async file => {
    let exists = null

    // Be sure we get a path passed
    if (!file) {
      return
    }

    // Be extra sure that it was removed, so that we
    // don't log out people for no reason
    try {
      exists = await pathExists(file)
    } catch (error) {
      console.error(error)
      return
    }

    if (exists) {
      return
    }

    logout('config-removed')
  })
}
