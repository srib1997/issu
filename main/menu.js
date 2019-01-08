// Packages
const {
  Menu: { buildFromTemplate }
} = require('electron')
const isDev = require('electron-is-dev')

// Utilities
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

exports.innerMenu = async function(app, tray, windows, inRenderer) {
  const { openAtLogin } = app.getLoginItemSettings()

  // We have to explicitly add a "Main" item on linux, otherwise
  // there would be no way to toggle the main window
  const prependItems =
    process.platform === 'linux'
      ? [
          {
            label: 'Main',
            click() {
              toggleWindow(null, windows.main, tray)
            }
          }
        ]
      : []

  return buildFromTemplate(
    prependItems.concat(
      [
        {
          label:
            process.platform === 'darwin' ? `About ${app.getName()}` : 'About',
          click() {
            toggleWindow(null, windows.about)
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Preferences',
          submenu: [
            {
              label: 'Launch at Login',
              type: 'checkbox',
              checked: openAtLogin,
              enabled: !isDev,
              click() {
                app.setLoginItemSettings({
                  openAtLogin: !openAtLogin
                })
              }
            }
          ]
        },
        inRenderer
          ? null
          : {
              type: 'separator'
            },
        // This is much better than using `visible` because
        // it does not affect the width of the menu.
        inRenderer
          ? null
          : {
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
      ].filter(Boolean)
    )
  )
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
