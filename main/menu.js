const {
  Menu: { buildFromTemplate }
} = require('electron')
const toggleWindow = require('./utils/frames/toggle')

const openDeveloperTools = windows => {
  if (!windows || Object.keys(windows).length === 0) {
    return
  }

  const list = Object.values(windows)

  for (const item of list) {
    item.webContents.openDevTools()
  }
}

exports.outerMenu = (app, windows) =>
  buildFromTemplate([
    {
      label: process.platform === 'darwin' ? `About ${app.getName()}` : 'About',
      click() {
        toggleWindow(null, windows.about)
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Open Developer Tools',
      click() {
        openDeveloperTools(windows)
      },
      accelerator: 'Cmd+I'
    },
    {
      type: 'separator'
    },
    {
      role: 'quit',
      accelerator: 'Cmd+Q'
    }
  ])
