/**
 * 主要
 * (邊到用到? main/index.js 會用到)
 * - 滙出firstRun function
 *   - 由 electron store 中讀取 firstRun 的值 (預設係 true)
 *   - 當 app 第一次執行過後，會將 electron store 中的 firstRun 設為 false
 */

// Packages
const Store = require('electron-store')

const getStore = opts => {
  opts = Object.assign({ defaults: { firstRun: true } }, opts)

  return new Store(opts)
}

const firstRun = opts => {
  const conf = getStore(opts)
  const isFirstRun = conf.get('firstRun')

  if (isFirstRun === true) {
    conf.set('firstRun', false)
  }

  return isFirstRun
}

module.exports = firstRun
