// Packages
// const fetch = require('node-fetch')

// Utilities
const notify = require('../notify')
const { error: handleError } = require('./error')
const { removeConfig } = require('./config')

module.exports = async reason => {
  const offline = process.env.CONNECTION === 'offline'
  const { windows } = global

  // Indicate that we're logging out
  console.log('Logging out...')

  // The app shouldn't log out if an error occurs while offline
  // Only do that while online
  if (offline || !windows) {
    return
  }

  // Hide the main window and close the dev tools
  if (windows && windows.main) {
    const contents = windows.main.webContents

    if (contents.isDevToolsOpened()) {
      contents.closeDevTools()
    }

    windows.main.hide()
  }

  try {
    await removeConfig()
  } catch (error) {
    handleError("Couldn't remove config while logging out", error)
  }

  const tutorialWindow = windows.tutorial

  // Prepare the tutorial by reloading its contents
  tutorialWindow.reload()

  // Once the content has loaded again, show it
  tutorialWindow.once('ready-to-show', () => {
    if (reason) {
      let body

      // This can be extended later
      switch (reason) {
        case 'config-removed':
          body = 'You were logged out. Click here to log back in.'
          break
        default:
          body = false
      }

      if (body) {
        notify({
          title: 'Logged Out',
          body,
          onClick() {
            tutorialWindow.show()
          }
        })

        return
      }
    }

    tutorialWindow.show()
  })
}
