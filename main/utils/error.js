/**
 * 主要
 * 1. 如果唔係 develop 的情況就重開
 * 2. 關閉 App
 * - main/index.js 中 process.on('uncaughtException') 時會用到
 * - logout 刪除 config 有錯誤時會用到
 */

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
