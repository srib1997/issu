/**
 * 主要
 * - 滙出一個 fn
 *   - 彈出一個 notification window
 *   - 當 config file 被刪除時, 會 logout, logout 會用到
 *   - logout notification 按一下時, 會彈出 tutorial window
 */

// Packages
const { shell, Notification } = require('electron')
const { resolve } = require('app-root-path')

const icon = resolve('./main/static/icons/windows.ico')

module.exports = ({ title, body, url, onClick }) => {
  const specs = {
    title,
    body,
    icon,
    silent: true
  }

  const notification = new Notification(specs)

  if (url || onClick) {
    notification.on('click', () => {
      if (onClick) {
        return onClick()
      }

      shell.openExternal(url)
    })
  }

  notification.show()
  console.log(`[Notification] ${title}: ${body}`)
}
