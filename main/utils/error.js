const { app } = require('electron')
const isDev = require('electron-is-dev')

exports.exception = async () => {
  // Restart the app, so that it doesn't continue
  // running in a broken state
  if (!isDev) {
    app.relaunch()
  }

  app.exit(0)
}
