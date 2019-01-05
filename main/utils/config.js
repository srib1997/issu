const path = require('path')
const { homedir } = require('os')
const fs = require('fs-extra')
const deepExtend = require('deep-extend')
const groom = require('groom')

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

exports.saveConfig = async (data, type) => {
  const destination = paths[type]
  let currentContent = {}

  try {
    currentContent = await fs.readJSON(destination)
  } catch (error) {}

  if (type === 'config') {
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

  if (!content.token) {
    // Throw new Error('No user token defined')
  }

  return content
}
