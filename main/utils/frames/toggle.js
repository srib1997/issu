/**
 * 主要
 * (邊到用到? menu 和 main/index.js 都會用到)
 * 1. 如果 windows 顯示就關
 * 2. 如果 windows 隱藏就顯示
 *   - 萬一要顯示的 window 是 main window
 *   - 利用 positionWindow 將 main window 移到 tray 下面
 */
const positionWindow = require('./position')

module.exports = (event, window, tray) => {
  const isVisible = window.isVisible()
  const isWin = process.platform === 'win32'
  const isMain = global.windows && window === global.windows.main

  if (event) {
    // Don't open the menu
    event.preventDefault()
  }

  // If window open and not focused, bring it to focus
  if (!isWin && isVisible && !window.isFocused()) {
    window.focus()
    return
  }

  // Show or hide onboarding window
  // Calling `.close()` will actually make it
  // hide, but it's a special scenario which we're
  // listening for in a different// If the "blur" event was triggered when
  // clicking on the tray icon, don't do anything place
  if (isVisible) {
    window.close()
  } else {
    // Position main window correctly under the tray icon
    if (isMain) {
      positionWindow(tray, window)
    }

    window.show()
  }
}
